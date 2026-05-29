const { createApp, interServiceFetch } = require('../shared/app');
const { validateOrderBody, validateOrderStatus } = require('../shared/validate');
const log = require('../shared/logger');

const { app, pool, sendError, start } = createApp('orders_db', process.env.PORT || 8081);

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8082';
const SHIPPING_URL = process.env.SHIPPING_SERVICE_URL || 'http://shipping-service:8084';

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL, sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL, status VARCHAR(30) DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT NOW(), assigned_to VARCHAR(100), cancel_reason VARCHAR(255))`);
}

app.get('/api/orders/test', (_req, res) => res.send('orders-service UP'));

app.post('/api/orders', async (req, res) => {
  try {
    const errors = validateOrderBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const { customerId, sku, quantity } = req.body;
    const order = (await pool.query(
      "INSERT INTO orders (customer_id, sku, quantity, status, created_at) VALUES ($1,$2,$3,'CREATED',NOW()) RETURNING *",
      [customerId, sku, quantity])).rows[0];
    res.status(201).json({ orderId: order.id, status: order.status, message: 'Orden creada correctamente', createdAt: order.created_at });
  } catch (err) { sendError(res, 500, 'Failed to create order', err); }
});

app.get('/api/orders', async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM orders ORDER BY created_at DESC')).rows); }
  catch (err) { sendError(res, 500, 'Failed to list orders', err); }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const statusErr = validateOrderStatus(req.query.status?.toUpperCase() || '');
    if (statusErr.length) return res.status(400).json({ error: statusErr.join(', ') });
    const result = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [req.query.status.toUpperCase(), req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to update status', err); }
});

app.put('/api/orders/:id/confirm', async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [orderId])).rows[0];
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    const errors = [];

    try { await interServiceFetch(`${INVENTORY_URL}/api/inventory/${order.sku}/adjust?delta=-${order.quantity}`, { method: 'POST' }); }
    catch (e) { log.error('Inventory adjustment failed', { orderId, message: e.message }); errors.push(`Inventario: ${e.message}`); }

    try { await interServiceFetch(`${SHIPPING_URL}/api/shipments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: parseInt(orderId), customerId: order.customer_id, sku: order.sku, quantity: order.quantity }) }); }
    catch (e) { log.error('Shipment creation failed', { orderId, message: e.message }); errors.push(`Envío: ${e.message}`); }

    await pool.query("UPDATE orders SET status='EN_PREPARACION' WHERE id=$1", [orderId]);
    const updated = (await pool.query('SELECT * FROM orders WHERE id=$1', [orderId])).rows[0];
    log.info('Order confirmed', { orderId, hasErrors: errors.length > 0 });
    res.json({ ...updated, warnings: errors.length ? errors : undefined });
  } catch (err) { sendError(res, 500, 'Failed to confirm order', err); }
});

app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id])).rows[0];
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    const reason = (req.body.reason || '').substring(0, 255);
    if (order.status === 'EN_PREPARACION') {
      try { await interServiceFetch(`${INVENTORY_URL}/api/inventory/${order.sku}/adjust?delta=+${order.quantity}`, { method: 'POST' }); }
      catch (e) { log.error('Stock restore failed', { orderId: req.params.id, message: e.message }); }
    }
    await pool.query("UPDATE orders SET status='CANCELADO', cancel_reason=$1 WHERE id=$2", [reason, req.params.id]);
    res.json((await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id])).rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to cancel order', err); }
});

app.put('/api/orders/:id/assign', async (req, res) => {
  try {
    const transporter = (req.query.transporter || '').substring(0, 100);
    if (!transporter) return res.status(400).json({ error: 'transporter es requerido' });
    const result = await pool.query('UPDATE orders SET assigned_to=$1 WHERE id=$2 RETURNING *', [transporter, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to assign', err); }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders WHERE id=$1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    log.info('Order deleted', { orderId: req.params.id });
    res.json({ message: 'Orden eliminada correctamente', order: result.rows[0] });
  } catch (err) { sendError(res, 500, 'Failed to delete order', err); }
});

app.get('/api/customers', (_req, res) => res.json([]));

(async () => { await ensureTables(); start(); })();
