const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { createPool } = require('../shared/db');
const { createSqsClient, getQueueUrl, ReceiveMessageCommand, DeleteMessageCommand } = require('../shared/sqs');
const log = require('../shared/logger');
const { validateShipmentBody, validateShipmentStage } = require('../shared/validate');
const { gracefulShutdown } = require('../shared/shutdown');

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const app = express();

app.use(cors({
  origin: ALLOWED_ORIGINS === '*' ? '*' : ALLOWED_ORIGINS.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

const PORT = process.env.PORT || 8084;
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8085';
const SHIPPING_QUEUE = process.env.SHIPPING_QUEUE || 'shipping-queue';
const pool = createPool('shipping_db');
const sqs = createSqsClient();
const PROCESSED_EVENTS = new Set();
const sqsPollingFlag = { shuttingDown: false };

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      sku VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'EN_PREPARACION',
      tracking_number VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW(),
      shipped_at TIMESTAMP,
      customer_code VARCHAR(20),
      recipient_rut VARCHAR(15),
      proof_of_delivery_image TEXT
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments (order_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments (status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments (customer_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_events (
      event_type VARCHAR(64) NOT NULL,
      event_key VARCHAR(128) NOT NULL,
      processed_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (event_type, event_key)
    )
  `);
}

function sendError(res, status, logMessage, err) {
  log.warn(logMessage, { error: err?.message || String(err) });
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : (err?.message || 'Request failed') });
}

async function sendNotification(shipment, stage, message) {
  try {
    const body = {
      eventId: uuidv4(),
      orderId: shipment.order_id,
      customerId: shipment.customer_id,
      stage,
      status: shipment.status,
      message,
      sourceService: 'shipping-service',
      audience: 'BOTH',
      occurredAt: new Date().toISOString(),
      version: '1',
    };

    const response = await fetch(`${NOTIFICATION_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      log.warn('Notification send returned non-OK', { status: response.status, stage, orderId: shipment.order_id });
    } else {
      log.info('Notification sent', { stage, orderId: shipment.order_id });
    }
  } catch (err) {
    log.error('Failed to send notification', { orderId: shipment.order_id, message: err.message });
  }
}

app.get('/api/shipments', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to list shipments', err);
  }
});

app.get('/api/shipments/:orderId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shipments WHERE order_id = $1', [req.params.orderId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Envio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to get shipment', err);
  }
});

app.post('/api/shipments', async (req, res) => {
  try {
    const errors = validateShipmentBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const { orderId, customerId, sku, quantity } = req.body;

    const existing = await pool.query('SELECT * FROM shipments WHERE order_id = $1', [orderId]);
    if (existing.rows.length) return res.status(409).json({ error: `Ya existe un envio para la orden ${orderId}` });

    const tracking = 'TRACK-' + uuidv4().substring(0, 8).toUpperCase();

    const result = await pool.query(
      `INSERT INTO shipments (order_id, customer_id, sku, quantity, status, tracking_number, created_at)
       VALUES ($1, $2, $3, $4, 'EN_PREPARACION', $5, NOW()) RETURNING *`,
      [orderId, customerId, sku, quantity, tracking]
    );

    const shipment = result.rows[0];
    log.info('Shipment created', { shipmentId: shipment.id, tracking });

    await sendNotification(shipment, 'SHIPMENT_CREATED', `Envio creado con tracking ${tracking}`);
    res.status(201).json(shipment);
  } catch (err) {
    sendError(res, 500, 'Failed to create shipment', err);
  }
});

app.put('/api/shipments/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const stage = (req.query.stage || '').toUpperCase();

    const stageError = validateShipmentStage(stage);
    if (stageError) return res.status(400).json({ error: stageError });

    const shipResult = await pool.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (!shipResult.rows.length) return res.status(404).json({ error: 'Envio no encontrado' });

    const shipment = shipResult.rows[0];
    let updated;

    if (stage === 'EN_REPARTO') {
      updated = (await pool.query(
        "UPDATE shipments SET status = 'EN_REPARTO', shipped_at = NOW() WHERE id = $1 RETURNING *",
        [id]
      )).rows[0];
      await sendNotification(updated, 'SHIPMENT_IN_TRANSIT',
        `Envio en reparto - Tracking: ${updated.tracking_number}`);
    } else if (stage === 'ENTREGADO') {
      const proof = req.body || {};
      updated = (await pool.query(
        `UPDATE shipments SET status = 'ENTREGADO', customer_code = $1, recipient_rut = $2, proof_of_delivery_image = $3 WHERE id = $4 RETURNING *`,
        [proof.customerCode || '', proof.recipientRut || '', proof.proofOfDeliveryImage || '', id]
      )).rows[0];
      await sendNotification(updated, 'SHIPMENT_DELIVERED',
        `Envio entregado - Tracking: ${updated.tracking_number}`);
    } else if (stage === 'CANCELADO') {
      updated = (await pool.query("UPDATE shipments SET status = 'CANCELADO' WHERE id = $1 RETURNING *", [id])).rows[0];
      await sendNotification(updated, 'SHIPMENT_CANCELLED',
        `Envio cancelado - Tracking: ${updated.tracking_number}`);
    }

    log.info('Shipment stage changed', { shipmentId: id, stage });
    res.json(updated);
  } catch (err) {
    sendError(res, 500, 'Failed to change stage', err);
  }
});

app.get('/api/shipments/:id/qr', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shipments WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Envio no encontrado' });
    res.json({ qrCode: 'SMARTLOGIX-' + result.rows[0].tracking_number });
  } catch (err) {
    sendError(res, 500, 'Failed to get QR', err);
  }
});

async function pollSqs() {
  const queueUrl = getQueueUrl(SHIPPING_QUEUE);

  while (!sqsPollingFlag.shuttingDown) {
    try {
      const data = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl, MaxNumberOfMessages: 5, WaitTimeSeconds: 10,
      }));
      if (data.Messages) {
        for (const msg of data.Messages) {
          let processed = false;
          try {
            const body = JSON.parse(msg.Body);
            const eventKey = `SHIPPING_CREATED:${body.orderId}`;

            if (PROCESSED_EVENTS.has(eventKey)) {
              processed = true;
              continue;
            }

            if (body.eventType === 'SHIPPING_CREATED') {
              const existing = await pool.query('SELECT * FROM shipments WHERE order_id = $1', [body.orderId]);
              if (!existing.rows.length) {
                const tracking = 'TRACK-' + uuidv4().substring(0, 8).toUpperCase();
                const result = await pool.query(
                  `INSERT INTO shipments (order_id, customer_id, sku, quantity, status, tracking_number, created_at)
                   VALUES ($1, $2, $3, $4, 'EN_PREPARACION', $5, NOW()) RETURNING *`,
                  [body.orderId, body.customerId, body.sku, body.quantity, tracking]
                );
                await sendNotification(result.rows[0], 'SHIPMENT_CREATED',
                  `Envio creado con tracking ${tracking}`);
              }
              PROCESSED_EVENTS.add(eventKey);

              await pool.query(
                'INSERT INTO processed_events (event_type, event_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                ['SHIPPING_CREATED', eventKey]
              );
            }
            processed = true;
          } catch (e) {
            log.error('Error processing shipping message', { message: e.message });
          } finally {
            if (processed) {
              await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: msg.ReceiptHandle }));
            }
          }
        }
      }
    } catch (err) {
      log.error('SQS poll error', { message: err.message });
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  log.info('SQS poller stopped');
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'DEGRADED', db: 'disconnected' });
  }
});

async function start() {
  await ensureTables();
  const server = app.listen(PORT, () => log.info(`shipping-service running on port ${PORT}`));
  gracefulShutdown(server, pool, sqsPollingFlag, 'shipping-service');
  pollSqs().catch(err => log.error('SQS poller fatal error', { message: err.message }));
}

start();
