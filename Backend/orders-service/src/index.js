const { createApp, interServiceFetch } = require('../shared/app');
const { validateOrderBody, validateOrderStatus } = require('../shared/validate');
const { sendEmail, buildOrderConfirmationEmail } = require('../shared/email');
const log = require('../shared/logger');

const { app, pool, sendError, start } = createApp('orders_db', process.env.PORT || 8081);

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8082';
const SHIPPING_URL = process.env.SHIPPING_SERVICE_URL || 'http://shipping-service:8084';

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL, sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL, status VARCHAR(30) DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT NOW(), assigned_to VARCHAR(100), cancel_reason VARCHAR(255))`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_code VARCHAR(20) UNIQUE`);
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(30),
    address VARCHAR(300), email VARCHAR(200), created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS rut VARCHAR(20)`);
}

async function ensureProcedures() {
  await pool.query(`
    CREATE OR REPLACE FUNCTION fn_get_orders_with_customer(p_status TEXT DEFAULT NULL)
    RETURNS TABLE(order_id INT, customer_name VARCHAR, customer_email VARCHAR,
                  sku VARCHAR, quantity INT, status VARCHAR, created_at TIMESTAMP, assigned_to VARCHAR)
    AS $fn$
    BEGIN
      RETURN QUERY
        SELECT o.id, COALESCE(c.name,'Sin cliente'), COALESCE(c.email,''),
               o.sku, o.quantity, o.status, o.created_at, o.assigned_to
        FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
        WHERE p_status IS NULL OR o.status = p_status
        ORDER BY o.created_at DESC;
    END;
    $fn$ LANGUAGE plpgsql;
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION fn_cancel_order(p_order_id INT, p_reason TEXT DEFAULT '')
    RETURNS SETOF orders AS $fn$
    BEGIN
      UPDATE orders SET status = 'CANCELADO', cancel_reason = p_reason
      WHERE id = p_order_id AND status <> 'CANCELADO';
      RETURN QUERY SELECT * FROM orders WHERE id = p_order_id;
    END;
    $fn$ LANGUAGE plpgsql;
  `);
}

// Roles that must NOT receive client_code in any response
const RESTRICTED_ROLES = new Set(['shipper', 'customer', 'vendor']);

function extractRoleFromRequest(req) {
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const groups = payload['cognito:groups'];
    return Array.isArray(groups) && groups.length ? groups[0].toLowerCase() : null;
  } catch { return null; }
}

function stripClientCode(rows) {
  rows.forEach(r => { delete r.client_code; });
  return rows;
}

app.get('/api/orders/test', (_req, res) => res.send('orders-service UP'));

// Public tracking — only safe fields, no contact data
app.get('/api/orders/track/:clientCode', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.id, o.sku, o.quantity, o.status, o.created_at, o.client_code, o.cancel_reason,
              c.name as customer_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.client_code = $1`,
      [req.params.clientCode.toUpperCase()]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Código de cliente no encontrado' });
    res.json(r.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to track order', err); }
});

app.get('/api/orders/report', async (req, res) => {
  try {
    const status = req.query.status ? req.query.status.toUpperCase() : null;
    const r = await pool.query('SELECT * FROM fn_get_orders_with_customer($1)', [status]);
    res.json(r.rows);
  } catch (err) { sendError(res, 500, 'Failed to get orders report', err); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const errors = validateOrderBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const { customerId, sku, quantity } = req.body;
    const clientCode = 'SL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const order = (await pool.query(
      "INSERT INTO orders (customer_id, sku, quantity, status, created_at, client_code) VALUES ($1,$2,$3,'CREATED',NOW(),$4) RETURNING *",
      [customerId, sku, quantity, clientCode])).rows[0];

    const customer = (await pool.query('SELECT * FROM customers WHERE id=$1', [customerId])).rows[0];
    const customerCode = order.client_code;

    if (customer && customer.email) {
      const { subject, html } = buildOrderConfirmationEmail({
        customerName: customer.name,
        orderId: order.id,
        sku: order.sku,
        quantity: order.quantity,
        customerCode,
        trackingCode: null
      });
      sendEmail({ to: customer.email, subject, html }).catch(() => {});
    }

    res.status(201).json({
      orderId: order.id, status: order.status, sku: order.sku,
      quantity: order.quantity, customerId: order.customer_id,
      message: 'Orden creada correctamente', createdAt: order.created_at,
      customerCode
    });
  } catch (err) { sendError(res, 500, 'Failed to create order', err); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const role = extractRoleFromRequest(req);
    const limit = req.query.limit ? Math.min(500, Math.max(1, parseInt(req.query.limit))) : null;
    const page = req.query.page ? Math.max(1, parseInt(req.query.page)) : null;
    let query = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params = [];
    if (limit && page) {
      const offset = (page - 1) * limit;
      query += ' LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }
    const rows = (await pool.query(query, params)).rows;
    if (RESTRICTED_ROLES.has(role)) stripClientCode(rows);
    res.json(rows);
  }
  catch (err) { sendError(res, 500, 'Failed to list orders', err); }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const role = extractRoleFromRequest(req);
    const r = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    const row = r.rows[0];
    if (RESTRICTED_ROLES.has(role)) delete row.client_code;
    res.json(row);
  } catch (err) { sendError(res, 500, 'Failed to get order', err); }
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

    if (order.status === 'EN_PREPARACION' || order.status === 'EN_REPARTO') {
      try { await interServiceFetch(`${INVENTORY_URL}/api/inventory/${order.sku}/adjust?delta=+${order.quantity}`, { method: 'POST' }); }
      catch (e) { log.error('Stock restore failed', { orderId: req.params.id, message: e.message }); }

      try {
        const shipmentResp = await interServiceFetch(`${SHIPPING_URL}/api/shipments/${order.id}`, { method: 'GET' });
        const shipment = await shipmentResp.json();
        if (shipment && shipment.id && shipment.status !== 'CANCELADO') {
          await interServiceFetch(`${SHIPPING_URL}/api/shipments/${shipment.id}/stage?stage=CANCELADO`, { method: 'PUT' });
          log.info('Linked shipment cancelled', { orderId: req.params.id, shipmentId: shipment.id });
        }
      } catch (e) { log.warn('Shipment cancel failed', { orderId: req.params.id, message: e.message }); }
    }

    const cancelled = (await pool.query('SELECT * FROM fn_cancel_order($1,$2)', [req.params.id, reason])).rows[0];
    res.json(cancelled);
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

app.get('/api/customers', async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM customers ORDER BY name')).rows); }
  catch (err) { sendError(res, 500, 'Failed to list customers', err); }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(r.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to get customer', err); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, address, email, rut } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const c = (await pool.query(
      'INSERT INTO customers (name, phone, address, email, rut) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name.trim(), phone || null, address || null, email || null, rut || null])).rows[0];
    res.status(201).json(c);
  } catch (err) { sendError(res, 500, 'Failed to create customer', err); }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, phone, address, email, rut } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const r = await pool.query(
      'UPDATE customers SET name=$1, phone=$2, address=$3, email=$4, rut=$5 WHERE id=$6 RETURNING *',
      [name.trim(), phone || null, address || null, email || null, rut || null, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(r.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed to update customer', err); }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM customers WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) { sendError(res, 500, 'Failed to delete customer', err); }
});

if (require.main === module) {
  (async () => { await ensureTables(); await ensureProcedures(); start(); })();
}

module.exports = { app };
