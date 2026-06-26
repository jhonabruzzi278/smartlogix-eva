const log = require('./logger');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@smartlogix.cl';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function sendEmail({ to, subject, html }) {
  if (!to) {
    log.warn('Email skipped: no recipient');
    return { sent: false, reason: 'No recipient' };
  }

  if (!SMTP_HOST) {
    log.info('[EMAIL DEMO]', { to, subject });
    log.info('[EMAIL DEMO] Body:', html.replace(/<[^>]*>/g, '').substring(0, 200));
    return { sent: false, reason: 'SMTP not configured (demo mode)', to, subject };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_PORT === '465',
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });

    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    log.info('Email sent', { to, subject });
    return { sent: true, to, subject };
  } catch (err) {
    log.error('Email failed', { to, subject, error: err.message });
    return { sent: false, reason: err.message, to, subject };
  }
}

function buildOrderConfirmationEmail({ customerName, orderId, sku, quantity, trackingCode, customerCode }) {
  const trackingUrl = `${APP_URL}/tracking/${trackingCode || orderId}`;
  const codeInfo = customerCode ? `<p><strong>Tu codigo de retiro/entrega:</strong> <span style="font-size:24px;font-weight:bold;color:#4B98CF">${customerCode}</span></p>` : '';

  return {
    subject: `SmartLogix - Pedido #${orderId} confirmado`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#112b4a">Hola ${customerName}</h2>
        <p>Tu pedido <strong>#${orderId}</strong> ha sido registrado y esta siendo procesado.</p>
        <div style="background:#F5F7F9;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>SKU:</strong> ${sku}</p>
          <p><strong>Cantidad:</strong> ${quantity} unidad(es)</p>
          ${trackingCode ? `<p><strong>Tracking:</strong> ${trackingCode}</p>` : ''}
          ${codeInfo}
        </div>
        <p>Puedes seguir el estado de tu pedido en:</p>
        <p><a href="${trackingUrl}" style="color:#4B98CF;font-weight:bold">${trackingUrl}</a></p>
        <hr style="border:none;border-top:1px solid #ECEEF0;margin:20px 0" />
        <p style="color:#6B7280;font-size:12px">SmartLogix - Gestion Logistica Inteligente</p>
      </div>
    `
  };
}

function buildShipmentUpdateEmail({ customerName, orderId, trackingCode, stage }) {
  const trackingUrl = `${APP_URL}/tracking/${trackingCode || orderId}`;
  const stageLabel = stage === 'EN_REPARTO' ? 'En reparto' :
    stage === 'ENTREGADO' ? 'Entregado' : stage;

  return {
    subject: `SmartLogix - Actualizacion de envio Pedido #${orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#112b4a">Hola ${customerName}</h2>
        <p>Tu pedido <strong>#${orderId}</strong> cambio de estado.</p>
        <div style="background:#F5F7F9;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Nuevo estado:</strong> <span style="color:#4B98CF">${stageLabel}</span></p>
          ${trackingCode ? `<p><strong>Tracking:</strong> ${trackingCode}</p>` : ''}
        </div>
        <p>Sigue tu pedido en:</p>
        <p><a href="${trackingUrl}" style="color:#4B98CF;font-weight:bold">${trackingUrl}</a></p>
        <hr style="border:none;border-top:1px solid #ECEEF0;margin:20px 0" />
        <p style="color:#6B7280;font-size:12px">SmartLogix - Gestion Logistica Inteligente</p>
      </div>
    `
  };
}

module.exports = { sendEmail, buildOrderConfirmationEmail, buildShipmentUpdateEmail };
