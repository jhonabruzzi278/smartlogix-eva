const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createPool } = require('../shared/db');
const log = require('../shared/logger');
const { validateNotificationBody } = require('../shared/validate');
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

const PORT = process.env.PORT || 8085;
const pool = createPool('notification_db');

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_records (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(64) NOT NULL,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      stage VARCHAR(40) NOT NULL,
      status VARCHAR(30) NOT NULL,
      message VARCHAR(500) NOT NULL,
      target_audience VARCHAR(20) NOT NULL,
      source_service VARCHAR(50) NOT NULL,
      occurred_at TIMESTAMP NOT NULL,
      received_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_order_id ON notification_records (order_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_audience ON notification_records (target_audience)`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_notification_event_audience') THEN
        ALTER TABLE notification_records ADD CONSTRAINT uk_notification_event_audience UNIQUE (event_id, target_audience);
      END IF;
    END $$;
  `);
}

function sendError(res, status, logMessage, err) {
  log.warn(logMessage, { error: err?.message || String(err) });
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : (err?.message || 'Request failed') });
}

app.post('/api/notifications', async (req, res) => {
  try {
    const event = req.body;
    const errors = validateNotificationBody(event);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const audience = event.audience || 'BOTH';

    const existing = await pool.query(
      'SELECT id FROM notification_records WHERE event_id = $1 AND target_audience = $2',
      [event.eventId, audience]
    );
    if (existing.rows.length) {
      return res.status(202).json({ status: 'DUPLICATE', eventId: event.eventId });
    }

    await pool.query(
      `INSERT INTO notification_records
       (event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [event.eventId, event.orderId, event.customerId, event.stage, event.status,
       event.message, audience, event.sourceService, event.occurredAt]
    );

    log.info('Notification persisted', { stage: event.stage, orderId: event.orderId });
    res.status(202).json({ status: 'ACCEPTED', eventId: event.eventId });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(202).json({ status: 'DUPLICATE', eventId: req.body.eventId });
    }
    sendError(res, 500, 'Failed to persist notification', err);
  }
});

app.get('/api/notifications/order/:orderId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notification_records WHERE order_id = $1 ORDER BY occurred_at ASC',
      [req.params.orderId]
    );
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to get notifications', err);
  }
});

app.get('/api/notifications/audience/:audience', async (req, res) => {
  try {
    const audience = req.params.audience.toUpperCase();
    if (!['CLIENT', 'OPERATOR', 'BOTH'].includes(audience)) {
      return res.status(400).json({ error: 'audience must be CLIENT, OPERATOR, or BOTH' });
    }
    const result = await pool.query(
      'SELECT * FROM notification_records WHERE target_audience = $1 ORDER BY occurred_at DESC',
      [audience]
    );
    res.json(result.rows);
  } catch (err) {
    sendError(res, 500, 'Failed to get notifications', err);
  }
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
  const server = app.listen(PORT, () => log.info(`notification-service running on port ${PORT}`));
  gracefulShutdown(server, pool, null, 'notification-service');
}

start();
