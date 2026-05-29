function validateOrderBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Body must be a JSON object'];
  if (!body.customerId || typeof body.customerId !== 'number' && isNaN(Number(body.customerId))) {
    errors.push('customerId must be a number');
  }
  if (!body.sku || typeof body.sku !== 'string') {
    errors.push('sku must be a string');
  }
  if (body.quantity === undefined || body.quantity === null || isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
    errors.push('quantity must be a positive number');
  }
  return errors;
}

function validateInventoryBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Body must be a JSON object'];
  if (!body.sku || typeof body.sku !== 'string') {
    errors.push('sku must be a string');
  }
  if (body.stock === undefined || body.stock === null || isNaN(Number(body.stock)) || Number(body.stock) < 0) {
    errors.push('stock must be a non-negative number');
  }
  return errors;
}

function validateSaleBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Body must be a JSON object'];
  if (!body.sku || typeof body.sku !== 'string') {
    errors.push('sku must be a string');
  }
  if (body.quantity === undefined || body.quantity === null || isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
    errors.push('quantity must be a positive number');
  }
  return errors;
}

function validateShipmentBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Body must be a JSON object'];
  if (!body.orderId || isNaN(Number(body.orderId))) {
    errors.push('orderId must be a number');
  }
  if (!body.customerId || isNaN(Number(body.customerId))) {
    errors.push('customerId must be a number');
  }
  if (!body.sku || typeof body.sku !== 'string') {
    errors.push('sku must be a string');
  }
  if (body.quantity === undefined || body.quantity === null || isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
    errors.push('quantity must be a positive number');
  }
  return errors;
}

function validateNotificationBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Body must be a JSON object'];
  if (!body.eventId || typeof body.eventId !== 'string') {
    errors.push('eventId must be a string');
  }
  if (!body.orderId || isNaN(Number(body.orderId))) {
    errors.push('orderId must be a number');
  }
  if (!body.stage || typeof body.stage !== 'string') {
    errors.push('stage must be a string');
  }
  if (!body.message || typeof body.message !== 'string') {
    errors.push('message must be a string');
  }
  return errors;
}

const VALID_ORDER_STATUSES = ['CREATED', 'EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];
const VALID_SHIPMENT_STAGES = ['EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];

function validateOrderStatus(status) {
  if (!status || !VALID_ORDER_STATUSES.includes(status)) {
    return `Invalid status: ${status}. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`;
  }
  return null;
}

function validateShipmentStage(stage) {
  if (!stage || !VALID_SHIPMENT_STAGES.includes(stage)) {
    return `Invalid stage: ${stage}. Must be one of: ${VALID_SHIPMENT_STAGES.join(', ')}`;
  }
  return null;
}

module.exports = {
  validateOrderBody,
  validateInventoryBody,
  validateSaleBody,
  validateShipmentBody,
  validateNotificationBody,
  validateOrderStatus,
  validateShipmentStage,
  VALID_ORDER_STATUSES,
};
