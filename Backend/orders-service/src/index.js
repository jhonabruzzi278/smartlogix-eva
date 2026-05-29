const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { createPool } = require('../shared/db');
const { createSqsClient, sendMessage } = require('../shared/sqs');
const log = require('../shared/logger');
const { validateOrderBody, validateOrderStatus } = require('../shared/validate');
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

const PORT = process.env.PORT || 8081;
const ORDERS_QUEUE = process.env.ORDERS_QUEUE || 'orders-queue';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8082';
const SHIPPING_SERVICE_URL = process.env.SHIPPING_SERVICE_URL || 'http://shipping-service:8084';
const pool = createPool('orders_db');
const sqs = createSqsClient();

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      sku VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
      created_at TIMESTAMP DEFAULT NOW(),
      assigned_to VARCHAR(100),
      cancel_reason VARCHAR(255)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_sku ON orders (sku)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at)`);
}

function sendError(res, status, logMessage, err) {
  log.warn(logMessage, { error: err?.message || String(err) });
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : (err?.message || 'Request failed') });
}

async function interServiceFetch(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  return response;
}

app.get('/api/orders/test', (_req, res) => {
  res.send('El controlador de Ordenes de SmartLogix esta activo!');
});

app.post('/api/orders', async (req, res) => {
  try {
    const errors = validateOrderBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const { customerId, sku, quantity } = req.body;
    const result = await pool.query(
      `INSERT INTO orders (customer_id, sku, quantity, status, created_at)
       VALUES ($1, $2, $3, 'CREATED', NOW()) RETURNING *`,
      [customerId, sku, quantity]
    );
    const order = result.rows[0];
    log.info('Order created', { orderId: order.id, sku, quantity });
    res.status(201).json({
      orderId: order.id,
      status: order.status,
      message: 'Orden creada correctamente',
      createdAt: order.created_at,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to create order', err);
  }
});

app.get('/api/orders', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to list orders', err);
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.query.status?.toUpperCase() || '';

    const statusError = validateOrderStatus(status);
    if (statusError) return res.status(400).json({ error: statusError });

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    log.info('Order status changed', { orderId: id, status });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to update status', err);
  }
});

app.put('/api/orders/:id/confirm', async (req, res) => {
  const orderId = req.params.id;
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const order = orderResult.rows[0];
    const errors = [];

    try {
      await interServiceFetch(
        `${INVENTORY_SERVICE_URL}/api/inventory/${order.sku}/adjust?delta=-${order.quantity}`,
        { method: 'POST' }
      );
    } catch (e) {
      log.error('Inventory adjustment failed', { orderId, message: e.message });
      errors.push(`Inventario: ${e.message}`);
    }

    try {
      await interServiceFetch(`${SHIPPING_SERVICE_URL}/api/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: parseInt(orderId, 10),
          customerId: order.customer_id,
          sku: order.sku,
          quantity: order.quantity,
        }),
      });
    } catch (e) {
      log.error('Shipment creation failed', { orderId, message: e.message });
      errors.push(`Envio: ${e.message}`);
    }

    try {
      await sendMessage(sqs, ORDERS_QUEUE, {
        eventId: uuidv4(),
        orderId: parseInt(orderId, 10),
        customerId: order.customer_id,
        sku: order.sku,
        quantity: order.quantity,
        eventType: 'ORDER_CONFIRMED',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      log.error('SQS publish failed', { orderId, message: e.message });
      errors.push(`Mensajeria: ${e.message}`);
    }

    await pool.query(
      "UPDATE orders SET status = 'EN_PREPARACION' WHERE id = $1",
      [orderId]
    );

    const updated = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    log.info('Order confirmed', { orderId, hasErrors: errors.length > 0, errors });
    res.json({ ...updated.rows[0], warnings: errors.length ? errors : undefined });
  } catch (err) {
    sendError(res, 500, 'Failed to confirm order', err);
  }
});

app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const order = orderResult.rows[0];
    const reason = (req.body.reason || '').substring(0, 255);

    if (order.status === 'EN_PREPARACION') {
      try {
        await interServiceFetch(
          `${INVENTORY_SERVICE_URL}/api/inventory/${order.sku}/adjust?delta=+${order.quantity}`,
          { method: 'POST' }
        );
      } catch (e) {
        log.error('Stock restore failed', { orderId: id, message: e.message });
      }
    }

    await pool.query(
      "UPDATE orders SET status = 'CANCELADO', cancel_reason = $1 WHERE id = $2",
      [reason, id]
    );

    const updated = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    log.info('Order cancelled', { orderId: id, reason });
    res.json(updated.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to cancel order', err);
  }
});

app.put('/api/orders/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const transporter = (req.query.transporter || '').substring(0, 100);
    if (!transporter) return res.status(400).json({ error: 'transporter is required' });

    const result = await pool.query(
      'UPDATE orders SET assigned_to = $1 WHERE id = $2 RETURNING *',
      [transporter, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    log.info('Transporter assigned', { orderId: id, transporter });
    res.json(result.rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to assign transporter', err);
  }
});

app.get('/api/customers', async (_req, res) => {
  res.json([]);
});

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
  const server = app.listen(PORT, () => log.info(`orders-service running on port ${PORT}`));
  gracefulShutdown(server, pool, null, 'orders-service');
}

start();
