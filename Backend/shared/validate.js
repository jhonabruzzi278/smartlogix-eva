function validateOrderBody(body) {
  const errors = [];
  if (!body || !body.customerId) errors.push('customerId es requerido');
  if (!body || !body.sku) errors.push('sku es requerido');
  if (!body || !body.quantity || body.quantity < 1) errors.push('quantity debe ser >= 1');
  return errors;
}

function validateOrderStatus(status) {
  const valid = ['CREATED', 'EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];
  if (!valid.includes(status)) return ['Status invalido: ' + status];
  return [];
}

function validateInventoryBody(body) {
  const errors = [];
  if (!body || !body.sku) errors.push('sku es requerido');
  if (!body || body.stock === undefined) errors.push('stock es requerido');
  return errors;
}

function validateSaleBody(body) {
  const errors = [];
  if (!body) { errors.push('body es requerido'); return errors; }
  if (!body.items && !body.sku) errors.push('items o sku es requerido');
  if (body.sku && (!body.quantity || body.quantity < 1)) errors.push('quantity debe ser >= 1');
  return errors;
}

function validateShipmentBody(body) {
  const errors = [];
  if (!body || !body.orderId) errors.push('orderId es requerido');
  if (!body || !body.sku) errors.push('sku es requerido');
  if (!body || !body.quantity) errors.push('quantity es requerido');
  return errors;
}

function validateShipmentStage(stage) {
  const valid = ['EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];
  if (!valid.includes(stage)) return ['Stage invalido: ' + stage];
  return [];
}

function validateNotificationBody(body) {
  const errors = [];
  if (!body || !body.eventId) errors.push('eventId es requerido');
  if (!body || !body.orderId) errors.push('orderId es requerido');
  if (!body || !body.stage) errors.push('stage es requerido');
  if (!body || !body.message) errors.push('message es requerido');
  return errors;
}

module.exports = { validateOrderBody, validateOrderStatus, validateInventoryBody, validateSaleBody, validateShipmentBody, validateShipmentStage, validateNotificationBody };
