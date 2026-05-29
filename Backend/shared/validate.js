function validateOrderBody(body) {
  const errors = [];
  if (!body || !body.customerId) errors.push('customerId es requerido');
  if (!body || !body.sku) errors.push('sku es requerido');
  if (!body || !body.quantity || body.quantity < 1) errors.push('quantity debe ser >= 1');
  return errors;
}

function validateOrderStatus(status) {
  const valid = ['CREATED', 'EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];
  if (!valid.includes(status)) throw Object.assign(new Error(`Status invalido: ${status}`), { status: 400 });
}

function validateInventoryBody(body) {
  if (!body || !body.sku || body.stock === undefined) throw Object.assign(new Error('sku y stock son requeridos'), { status: 400 });
}

function validateSaleBody(body) {
  if (!body || !body.sku || !body.quantity) throw Object.assign(new Error('sku y quantity son requeridos'), { status: 400 });
}

function validateShipmentBody(body) {
  if (!body || !body.orderId || !body.sku || !body.quantity) throw Object.assign(new Error('orderId, sku, quantity requeridos'), { status: 400 });
}

function validateShipmentStage(stage) {
  const valid = ['EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];
  if (!valid.includes(stage)) throw Object.assign(new Error(`Stage invalido: ${stage}`), { status: 400 });
}

function validateNotificationBody(body) {
  if (!body || !body.eventId || !body.orderId || !body.stage || !body.message) throw Object.assign(new Error('eventId, orderId, stage, message requeridos'), { status: 400 });
}

module.exports = { validateOrderBody, validateOrderStatus, validateInventoryBody, validateSaleBody, validateShipmentBody, validateShipmentStage, validateNotificationBody };
