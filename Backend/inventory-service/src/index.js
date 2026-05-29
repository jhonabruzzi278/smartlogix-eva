const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { createPool } = require('../shared/db');
const { createSqsClient, sendMessage, getQueueUrl, ReceiveMessageCommand, DeleteMessageCommand } = require('../shared/sqs');
const log = require('../shared/logger');
const { validateInventoryBody, validateSaleBody } = require('../shared/validate');
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
  legacyHeaders: false, validate: { xForwardedForHeader: false },
  message: { error: 'Too many requests, please try again later' },
}));

const PORT = process.env.PORT || 8082;
const SHIPPING_QUEUE = process.env.SHIPPING_QUEUE || 'shipping-queue';
const ORDERS_QUEUE = process.env.ORDERS_QUEUE || 'orders-queue';
const pool = createPool('inventory_db');
const sqs = createSqsClient();
const PROCESSED_EVENTS = new Set();
const sqsPollingFlag = { shuttingDown: false };

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku ON inventory (sku)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory (stock)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      sale_date TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_sku ON sales (sku)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date)`);

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

app.get('/api/inventory', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to list inventory', err);
  }
});

app.get('/api/inventory/:sku', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE sku = $1', [req.params.sku]);
    if (!result.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to get inventory', err);
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const errors = validateInventoryBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const { sku, stock } = req.body;
    const existing = await pool.query('SELECT * FROM inventory WHERE sku = $1', [sku]);
    if (existing.rows.length) return res.status(409).json({ error: 'SKU ya existe' });

    const result = await pool.query(
      'INSERT INTO inventory (sku, stock) VALUES ($1, $2) RETURNING *',
      [sku, stock || 0]
    );
    log.info('Product added', { sku, stock: stock || 0 });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to create inventory', err);
  }
});

app.put('/api/inventory/:sku', async (req, res) => {
  try {
    if (req.body.stock === undefined || isNaN(Number(req.body.stock)) || Number(req.body.stock) < 0) {
      return res.status(400).json({ error: 'stock must be a non-negative number' });
    }
    const result = await pool.query(
      'UPDATE inventory SET stock = $1 WHERE sku = $2 RETURNING *',
      [Number(req.body.stock), req.params.sku]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to update inventory', err);
  }
});

app.post('/api/inventory/:sku/adjust', async (req, res) => {
  try {
    const delta = parseInt(req.query.delta, 10);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ error: 'delta must be a non-zero integer' });
    }

    const result = await pool.query(
      'UPDATE inventory SET stock = stock + $1 WHERE sku = $2 AND stock + $1 >= 0 RETURNING *',
      [delta, req.params.sku]
    );

    if (!result.rows.length) {
      const exists = await pool.query('SELECT * FROM inventory WHERE sku = $1', [req.params.sku]);
      if (!exists.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    if (delta < 0) {
      await pool.query(
        'INSERT INTO sales (sku, quantity) VALUES ($1, $2)',
        [req.params.sku, Math.abs(delta)]
      );
    }

    log.info('Stock adjusted', { sku: req.params.sku, delta, newStock: result.rows[0].stock });
    res.json({ sku: req.params.sku, stock: result.rows[0].stock, delta });
  } catch (err) {
    sendError(res, 500, 'Failed to adjust stock', err);
  }
});

app.get('/api/sales', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY sale_date DESC');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to list sales', err);
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const errors = validateSaleBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const { sku, quantity } = req.body;

    const invResult = await pool.query(
      'UPDATE inventory SET stock = stock - $1 WHERE sku = $2 AND stock >= $1 RETURNING *',
      [quantity, sku]
    );

    if (!invResult.rows.length) {
      const exists = await pool.query('SELECT * FROM inventory WHERE sku = $1', [sku]);
      if (!exists.rows.length) return res.status(404).json({ error: 'SKU no encontrado' });
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    const result = await pool.query(
      'INSERT INTO sales (sku, quantity) VALUES ($1, $2) RETURNING *',
      [sku, quantity]
    );
    log.info('Sale recorded', { sku, quantity });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to record sale', err);
  }
});

async function pollSqs(queueName, handler) {
  while (!sqsPollingFlag.shuttingDown) {
    try {
      const cmd = new ReceiveMessageCommand({
        QueueUrl: getQueueUrl(queueName),
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 10,
      });
      const data = await sqs.send(cmd);
      if (data.Messages) {
        for (const msg of data.Messages) {
          try {
            const body = JSON.parse(msg.Body);
            const eventKey = `ORDER_CONFIRMED:${body.orderId}`;

            if (PROCESSED_EVENTS.has(eventKey)) {
              await sqs.send(new DeleteMessageCommand({
                QueueUrl: getQueueUrl(queueName),
                ReceiptHandle: msg.ReceiptHandle,
              }));
              continue;
            }

            await handler(body);
            PROCESSED_EVENTS.add(eventKey);

            await pool.query(
              'INSERT INTO processed_events (event_type, event_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              ['ORDER_CONFIRMED', eventKey]
            );

            await sqs.send(new DeleteMessageCommand({
              QueueUrl: getQueueUrl(queueName),
              ReceiptHandle: msg.ReceiptHandle,
            }));
          } catch (e) {
            log.error('Error processing SQS message', { message: e.message });
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        log.error('SQS poll error', { message: err.message });
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  log.info('SQS poller stopped');
}

async function handleOrderConfirmed(event) {
  log.info('Order confirmed', { orderId: event.orderId, sku: event.sku, quantity: event.quantity });
  await sendMessage(sqs, SHIPPING_QUEUE, {
    eventId: uuidv4(),
    orderId: event.orderId,
    customerId: event.customerId,
    sku: event.sku,
    quantity: event.quantity,
    eventType: 'SHIPPING_CREATED',
    timestamp: new Date().toISOString(),
  });
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
  const server = app.listen(PORT, () => log.info(`inventory-service running on port ${PORT}`));
  gracefulShutdown(server, pool, sqsPollingFlag, 'inventory-service');
  pollSqs(ORDERS_QUEUE, handleOrderConfirmed).catch(err =>
    log.error('SQS poller fatal error', { message: err.message })
  );
}

start();
