const { createApp } = require('../shared/app');
const { validateShipmentBody, validateShipmentStage } = require('../shared/validate');
const { sendEmail, buildShipmentUpdateEmail } = require('../shared/email');
const { authMiddleware } = require('../shared/auth');
const log = require('../shared/logger');

const { app, pool, sendError, start } = createApp('shipping_db', process.env.PORT || 8084);
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8085';
const ORDERS_URL = process.env.ORDERS_SERVICE_URL || 'http://orders-service:8081';

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL, customer_id INTEGER DEFAULT 0,
    sku VARCHAR(100) NOT NULL, quantity INTEGER NOT NULL, status VARCHAR(30) DEFAULT 'EN_PREPARACION',
    tracking_number VARCHAR(20), created_at TIMESTAMP DEFAULT NOW(), shipped_at TIMESTAMP,
    customer_code VARCHAR(20), recipient_rut VARCHAR(15), proof_of_delivery_image TEXT)`);
  await pool.query(`ALTER TABLE shipments ALTER COLUMN customer_id DROP NOT NULL`).catch(() => {});
  await pool.query(`CREATE TABLE IF NOT EXISTS processed_events (event_type VARCHAR(64) NOT NULL, event_key VARCHAR(128) NOT NULL, processed_at TIMESTAMP DEFAULT NOW(), PRIMARY KEY (event_type, event_key))`);
}

async function sendNotification(req, shipment, stage, message) {
  try {
    await req.forwardedFetch(`${NOTIFICATION_URL}/api/notifications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: require('uuid').v4(), orderId: shipment.order_id, customerId: shipment.customer_id, stage, status: shipment.status, message, sourceService: 'shipping-service', audience: 'BOTH', occurredAt: new Date().toISOString() }) });
  } catch (e) { log.error('Notification failed', { orderId: shipment.order_id, message: e.message }); }
}

app.get('/api/shipments', authMiddleware, async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM shipments ORDER BY created_at DESC')).rows); }
  catch (err) { sendError(res, 500, 'Failed', err); }
});

app.get('/api/shipments/:orderId', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM shipments WHERE order_id=$1', [req.params.orderId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Envío no encontrado' });
    res.json(r.rows[0]);
  } catch (err) { sendError(res, 500, 'Failed', err); }
});

app.post('/api/shipments', authMiddleware, async (req, res) => {
  try {
    const errors = validateShipmentBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const { orderId, sku, quantity } = req.body;
    const customerId = req.body.customerId || 0;
    if ((await pool.query('SELECT 1 FROM shipments WHERE order_id=$1', [orderId])).rows.length)
      return res.status(409).json({ error: `Ya existe envío para orden ${orderId}` });
    const tracking = 'TRACK-' + require('uuid').v4().substring(0, 8).toUpperCase();
    const shipment = (await pool.query(`INSERT INTO shipments (order_id,customer_id,sku,quantity,status,tracking_number,created_at) VALUES ($1,$2,$3,$4,'EN_PREPARACION',$5,NOW()) RETURNING *`, [orderId, customerId, sku, quantity, tracking])).rows[0];
    await sendNotification(req, shipment, 'SHIPMENT_CREATED', `Envío creado tracking ${tracking}`);
    res.status(201).json(shipment);
  } catch (err) { sendError(res, 500, 'Failed to create shipment', err); }
});

app.put('/api/shipments/:id/stage', authMiddleware, async (req, res) => {
  try {
    const stageErr = validateShipmentStage((req.query.stage || '').toUpperCase());
    if (stageErr.length) return res.status(400).json({ error: stageErr.join(', ') });
    const stage = req.query.stage.toUpperCase();
    const shipment = (await pool.query('SELECT * FROM shipments WHERE id=$1', [req.params.id])).rows[0];
    if (!shipment) return res.status(404).json({ error: 'Envío no encontrado' });

    let updated, notifStage, notifMsg;
    if (stage === 'EN_REPARTO') {
      updated = (await pool.query("UPDATE shipments SET status='EN_REPARTO',shipped_at=NOW() WHERE id=$1 RETURNING *", [req.params.id])).rows[0];
      notifStage = 'SHIPMENT_IN_TRANSIT'; notifMsg = `Envío en reparto - ${updated.tracking_number}`;
      try { await req.forwardedFetch(`${ORDERS_URL}/api/orders/${shipment.order_id}/status?status=EN_REPARTO`, { method: 'PUT' }); }
      catch (e) { log.warn('Order status sync failed', { orderId: shipment.order_id, message: e.message }); }
      if (shipment.customer_id && shipment.customer_id > 0) {
        try {
          const [orderRes, custRes] = await Promise.all([
            req.forwardedFetch(`${ORDERS_URL}/api/orders/${shipment.order_id}`),
            req.forwardedFetch(`${ORDERS_URL}/api/customers/${shipment.customer_id}`)
          ]);
          const [orderData, custData] = await Promise.all([orderRes.json(), custRes.json()]);
          if (custData && custData.email) {
            const { subject, html } = buildShipmentUpdateEmail({
              customerName: custData.name, orderId: shipment.order_id,
              clientCode: orderData.client_code, trackingCode: updated.tracking_number, stage
            });
            sendEmail({ to: custData.email, subject, html }).catch(() => {});
          }
        } catch (e) { log.warn('Email EN_REPARTO failed', { orderId: shipment.order_id, message: e.message }); }
      }
    } else if (stage === 'ENTREGADO') {
      const p = req.body || {};
      const normalizeRut = (r) => (r || '').replace(/[.\-\s]/g, '').toUpperCase();

      let orderData = null;
      let customerData = null;
      try {
        const orderRes = await req.forwardedFetch(`${ORDERS_URL}/api/orders/${shipment.order_id}`);
        if (orderRes.ok) orderData = await orderRes.json();
      } catch (e) { log.warn('Could not fetch order for validation', { orderId: shipment.order_id, message: e.message }); }

      if (orderData && orderData.client_code) {
        const expected = (orderData.client_code).toUpperCase().trim();
        const provided = (p.customerCode || '').toUpperCase().trim();
        if (provided !== expected) {
          return res.status(400).json({ error: 'Código de cliente incorrecto. Verifica el código proporcionado por el cliente.' });
        }
      }

      if (shipment.customer_id && shipment.customer_id !== 0) {
        try {
          const custRes = await req.forwardedFetch(`${ORDERS_URL}/api/customers/${shipment.customer_id}`);
          if (custRes.ok) customerData = await custRes.json();
        } catch (e) { log.warn('Could not fetch customer for validation', { customerId: shipment.customer_id, message: e.message }); }

        if (customerData && customerData.rut) {
          const expectedRut = normalizeRut(customerData.rut);
          const providedRut = normalizeRut(p.recipientRut);
          if (providedRut !== expectedRut) {
            return res.status(400).json({ error: 'RUT incorrecto. No coincide con el RUT del cliente registrado.' });
          }
        }
      }

      updated = (await pool.query("UPDATE shipments SET status='ENTREGADO',customer_code=$1,recipient_rut=$2,proof_of_delivery_image=$3 WHERE id=$4 RETURNING *", [p.customerCode||'', p.recipientRut||'', p.proofOfDeliveryImage||null, req.params.id])).rows[0];
      notifStage = 'SHIPMENT_DELIVERED'; notifMsg = `Envío entregado - ${updated.tracking_number}`;
      try { await req.forwardedFetch(`${ORDERS_URL}/api/orders/${shipment.order_id}/status?status=ENTREGADO`, { method: 'PUT' }); }
      catch (e) { log.warn('Order status sync failed', { orderId: shipment.order_id, message: e.message }); }
      if (customerData && customerData.email) {
        const { subject, html } = buildShipmentUpdateEmail({
          customerName: customerData.name, orderId: shipment.order_id,
          clientCode: orderData && orderData.client_code, trackingCode: updated.tracking_number, stage
        });
        sendEmail({ to: customerData.email, subject, html }).catch(e => log.warn('Email ENTREGADO failed', { orderId: shipment.order_id, message: e.message }));
      }
    } else {
      updated = (await pool.query('UPDATE shipments SET status=$1 WHERE id=$2 RETURNING *', [stage, req.params.id])).rows[0];
      notifStage = 'SHIPMENT_CANCELLED'; notifMsg = `Envío cancelado - ${updated.tracking_number}`;
      if (stage === 'CANCELADO') {
        try { await req.forwardedFetch(`${ORDERS_URL}/api/orders/${shipment.order_id}/status?status=CANCELADO`, { method: 'PUT' }); }
        catch (e) { log.warn('Order status sync failed', { orderId: shipment.order_id, message: e.message }); }
      }
    }
    await sendNotification(req, updated, notifStage, notifMsg);
    res.json(updated);
  } catch (err) { sendError(res, 500, 'Failed to change stage', err); }
});

app.get('/api/shipments/:id/qr', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM shipments WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Envío no encontrado' });
    res.json({ qrCode: 'SMARTLOGIX-' + r.rows[0].tracking_number });
  } catch (err) { sendError(res, 500, 'Failed', err); }
});

if (require.main === module) {
  (async () => { await ensureTables(); start(); })();
}

module.exports = { app };
