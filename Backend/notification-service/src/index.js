const { createApp } = require('../shared/app');
const { validateNotificationBody } = require('../shared/validate');
const log = require('../shared/logger');

const { app, pool, sendError, start } = createApp('notification_db', process.env.PORT || 8085);

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS notification_records (
    id SERIAL PRIMARY KEY, event_id VARCHAR(64) NOT NULL, order_id INTEGER NOT NULL,
    customer_id INTEGER DEFAULT 0, stage VARCHAR(40) NOT NULL, status VARCHAR(30) DEFAULT 'NOTIFIED',
    message VARCHAR(500) NOT NULL, target_audience VARCHAR(20) NOT NULL,
    source_service VARCHAR(50) DEFAULT 'external', occurred_at TIMESTAMP DEFAULT NOW(), received_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_order ON notification_records (order_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_audience ON notification_records (target_audience)`);
  await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uk_notif_event_audience') THEN ALTER TABLE notification_records ADD CONSTRAINT uk_notif_event_audience UNIQUE (event_id, target_audience); END IF; END $$`);
  await pool.query(`ALTER TABLE notification_records ALTER COLUMN customer_id DROP NOT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE notification_records ALTER COLUMN status DROP NOT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE notification_records ALTER COLUMN source_service DROP NOT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE notification_records ALTER COLUMN occurred_at DROP NOT NULL`).catch(() => {});
}

app.post('/api/notifications', async (req, res) => {
  try {
    const errors = validateNotificationBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const e = req.body, audience = (e.audience || 'BOTH').toUpperCase();
    if ((await pool.query('SELECT 1 FROM notification_records WHERE event_id=$1 AND target_audience=$2', [e.eventId, audience])).rows.length)
      return res.status(409).json({ status: 'DUPLICATE', eventId: e.eventId });
    await pool.query(`INSERT INTO notification_records (event_id,order_id,customer_id,stage,status,message,target_audience,source_service,occurred_at,received_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [e.eventId, e.orderId, e.customerId || 0, e.stage, e.status || 'NOTIFIED', e.message, audience, e.sourceService || 'external', e.occurredAt || new Date()]);
    res.status(201).json({ status: 'ACCEPTED', eventId: e.eventId });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ status: 'DUPLICATE', eventId: req.body.eventId });
    sendError(res, 500, 'Failed', err);
  }
});

app.get('/api/notifications/order/:orderId', async (req, res) => {
  try {
    const rows = (await pool.query('SELECT * FROM notification_records WHERE order_id=$1 ORDER BY occurred_at ASC', [req.params.orderId])).rows;
    if (!rows.length) return res.status(404).json({ error: 'No hay notificaciones para esta orden' });
    res.json(rows);
  } catch (err) { sendError(res, 500, 'Failed', err); }
});

app.get('/api/notifications/audience/:audience', async (req, res) => {
  try {
    const raw = req.params.audience.toUpperCase();
    const aliasMap = { CUSTOMER: 'CLIENT', CLIENTE: 'CLIENT' };
    const a = aliasMap[raw] || raw;
    if (!['CLIENT','OPERATOR','BOTH'].includes(a)) return res.status(400).json({ error: 'audience invalido. Valores: CLIENT, OPERATOR, BOTH' });
    res.json((await pool.query('SELECT * FROM notification_records WHERE target_audience=$1 ORDER BY occurred_at DESC', [a])).rows);
  } catch (err) { sendError(res, 500, 'Failed', err); }
});

app.post('/api/notifications/alert', async (req, res) => {
  try {
    const { sku, name, stock, type, vendor } = req.body;
    if (!sku || stock === undefined) return res.status(400).json({ error: 'sku y stock son requeridos' });
    const eventId = `alert-${sku}-${Date.now()}`;
    const message = `${vendor || 'Vendedor'} reporta stock ${type === 'critical_stock' ? 'critico' : 'bajo'} en ${name || sku}: ${stock} unidades`;
    await pool.query(
      `INSERT INTO notification_records (event_id,order_id,stage,status,message,target_audience,source_service,occurred_at,received_at) VALUES ($1,0,'STOCK_ALERT','NOTIFIED',$2,'OPERATOR','frontend-alert',NOW(),NOW())`,
      [eventId, message]
    );
    res.status(201).json({ status: 'ALERT_SENT', eventId, message });
  } catch (err) { sendError(res, 500, 'Failed', err); }
});

app.delete('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notification_records');
    log.info('Notification history cleared', { deletedCount: result.rowCount });
    res.json({ message: 'Historial de notificaciones vaciado', deletedCount: result.rowCount });
  } catch (err) { sendError(res, 500, 'Failed to clear notifications', err); }
});

if (require.main === module) {
  (async () => { await ensureTables(); start(); })();
}

module.exports = { app };
