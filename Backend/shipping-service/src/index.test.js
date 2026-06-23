'use strict';

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-1234-test') }));
jest.mock('../shared/db', () => ({ createPool: jest.fn() }));
jest.mock('../shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../shared/security', () => ({ applySecurity: jest.fn() }));
jest.mock('../shared/shutdown', () => ({ gracefulShutdown: jest.fn() }));

const request = require('supertest');
const { createPool } = require('../shared/db');

const mockQuery = jest.fn();
createPool.mockReturnValue({ query: mockQuery, on: jest.fn(), end: jest.fn() });

const { app } = require('./index');

const mockShipment = {
  id: 1, order_id: 1, customer_id: 10, sku: 'COCA-2L', quantity: 5,
  status: 'EN_PREPARACION', tracking_number: 'TRACK-UUID-123',
  created_at: new Date().toISOString(), shipped_at: null,
  customer_code: null, recipient_rut: null, proof_of_delivery_image: null
};

const validShipmentBody = { orderId: 1, customerId: 10, sku: 'COCA-2L', quantity: 5 };

describe('shipping-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  describe('GET /health', () => {
    it('retorna UP cuando BD disponible', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [1] });
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('retorna DEGRADED cuando BD falla', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));
      const res = await request(app).get('/health');
      expect(res.status).toBe(503);
    });
  });

  describe('GET /api/shipments', () => {
    it('retorna lista de envíos', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockShipment] });
      const res = await request(app).get('/api/shipments');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].tracking_number).toBe('TRACK-UUID-123');
    });

    it('retorna array vacío si no hay envíos', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/shipments');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/shipments/:orderId', () => {
    it('retorna envío por orderId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockShipment] });
      const res = await request(app).get('/api/shipments/1');
      expect(res.status).toBe(200);
      expect(res.body.order_id).toBe(1);
    });

    it('retorna 404 si no existe envío para esa orden', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/shipments/999');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no encontrado/i);
    });
  });

  describe('POST /api/shipments', () => {
    it('crea envío válido y genera tracking', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockShipment] });
      const res = await request(app).post('/api/shipments').send(validShipmentBody);
      expect(res.status).toBe(201);
      expect(res.body.tracking_number).toBe('TRACK-UUID-123');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('rechaza body sin orderId', async () => {
      const { orderId, ...sin } = validShipmentBody;
      const res = await request(app).post('/api/shipments').send(sin);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/orderId/i);
    });

    it('rechaza body sin sku', async () => {
      const { sku, ...sin } = validShipmentBody;
      const res = await request(app).post('/api/shipments').send(sin);
      expect(res.status).toBe(400);
    });

    it('rechaza body sin quantity', async () => {
      const { quantity, ...sin } = validShipmentBody;
      const res = await request(app).post('/api/shipments').send(sin);
      expect(res.status).toBe(400);
    });

    it('retorna 409 si ya existe envío para la orden', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app).post('/api/shipments').send(validShipmentBody);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Ya existe envío/i);
    });

    it('sigue creando aunque falle la notificación', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockShipment] });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network fail'));
      const res = await request(app).post('/api/shipments').send(validShipmentBody);
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /api/shipments/:id/stage', () => {
    it('cambia stage a EN_REPARTO', async () => {
      const enReparto = { ...mockShipment, status: 'EN_REPARTO', shipped_at: new Date().toISOString() };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockShipment] })
        .mockResolvedValueOnce({ rows: [enReparto] });
      const res = await request(app).put('/api/shipments/1/stage?stage=EN_REPARTO');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('EN_REPARTO');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('cambia stage a ENTREGADO con datos de entrega', async () => {
      const entregado = { ...mockShipment, status: 'ENTREGADO', customer_code: 'C123', recipient_rut: '12.345.678-9' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockShipment] })
        .mockResolvedValueOnce({ rows: [entregado] });
      const res = await request(app)
        .put('/api/shipments/1/stage?stage=ENTREGADO')
        .send({ customerCode: 'C123', recipientRut: '12.345.678-9' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ENTREGADO');
    });

    it('cambia stage a CANCELADO', async () => {
      const cancelado = { ...mockShipment, status: 'CANCELADO' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockShipment] })
        .mockResolvedValueOnce({ rows: [cancelado] });
      const res = await request(app).put('/api/shipments/1/stage?stage=CANCELADO');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELADO');
    });

    it('rechaza stage inválido', async () => {
      const res = await request(app).put('/api/shipments/1/stage?stage=INVALIDO');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Stage invalido/i);
    });

    it('rechaza sin parámetro stage', async () => {
      const res = await request(app).put('/api/shipments/1/stage');
      expect(res.status).toBe(400);
    });

    it('retorna 404 si el envío no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/shipments/999/stage?stage=EN_REPARTO');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/shipments/:id/qr', () => {
    it('retorna código QR con el tracking del envío', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockShipment] });
      const res = await request(app).get('/api/shipments/1/qr');
      expect(res.status).toBe(200);
      expect(res.body.qrCode).toBe('SMARTLOGIX-TRACK-UUID-123');
    });

    it('retorna 404 si el envío no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/shipments/999/qr');
      expect(res.status).toBe(404);
    });
  });
});
