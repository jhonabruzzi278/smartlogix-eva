'use strict';

jest.mock('../shared/db', () => ({ createPool: jest.fn() }));
jest.mock('../shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../shared/security', () => ({ applySecurity: jest.fn() }));
jest.mock('../shared/shutdown', () => ({ gracefulShutdown: jest.fn() }));

const request = require('supertest');
const { createPool } = require('../shared/db');

const mockQuery = jest.fn();
createPool.mockReturnValue({ query: mockQuery, on: jest.fn(), end: jest.fn() });

const { app } = require('./index');

const validNotification = {
  eventId: 'evt-001',
  orderId: 1,
  customerId: 10,
  stage: 'SHIPMENT_CREATED',
  status: 'info',
  message: 'Pedido creado',
  sourceService: 'shipping-service',
  audience: 'BOTH',
  occurredAt: new Date().toISOString()
};

describe('notification-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
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
      expect(res.body.status).toBe('DEGRADED');
    });
  });

  describe('POST /api/notifications', () => {
    it('acepta notificación válida (ACCEPTED)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/notifications').send(validNotification);
      expect(res.status).toBe(202);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.eventId).toBe('evt-001');
    });

    it('retorna DUPLICATE para eventId ya existente', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app).post('/api/notifications').send(validNotification);
      expect(res.status).toBe(202);
      expect(res.body.status).toBe('DUPLICATE');
    });

    it('retorna DUPLICATE por violación de constraint único (code 23505)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(Object.assign(new Error('unique'), { code: '23505' }));
      const res = await request(app).post('/api/notifications').send(validNotification);
      expect(res.status).toBe(202);
      expect(res.body.status).toBe('DUPLICATE');
    });

    it('rechaza notificación sin eventId', async () => {
      const { eventId, ...sin } = validNotification;
      const res = await request(app).post('/api/notifications').send(sin);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/eventId/i);
    });

    it('rechaza sin orderId', async () => {
      const { orderId, ...sin } = validNotification;
      const res = await request(app).post('/api/notifications').send(sin);
      expect(res.status).toBe(400);
    });

    it('rechaza sin stage', async () => {
      const { stage, ...sin } = validNotification;
      const res = await request(app).post('/api/notifications').send(sin);
      expect(res.status).toBe(400);
    });

    it('rechaza sin message', async () => {
      const { message, ...sin } = validNotification;
      const res = await request(app).post('/api/notifications').send(sin);
      expect(res.status).toBe(400);
    });

    it('usa BOTH como audience por defecto', async () => {
      const { audience, ...sin } = validNotification;
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/notifications').send(sin);
      expect(res.status).toBe(202);
      expect(res.body.status).toBe('ACCEPTED');
    });
  });

  describe('GET /api/notifications/order/:orderId', () => {
    it('retorna eventos de una orden', async () => {
      const mockEvents = [
        { id: 1, order_id: 1, stage: 'SHIPMENT_CREATED', message: 'Creado' }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockEvents });
      const res = await request(app).get('/api/notifications/order/1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].order_id).toBe(1);
    });

    it('retorna array vacío si no hay notificaciones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/notifications/order/999');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/notifications/audience/:audience', () => {
    it('retorna notificaciones para audiencia OPERATOR', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, target_audience: 'OPERATOR' }] });
      const res = await request(app).get('/api/notifications/audience/OPERATOR');
      expect(res.status).toBe(200);
      expect(res.body[0].target_audience).toBe('OPERATOR');
    });

    it('acepta CLIENT en minúsculas (normaliza a uppercase)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/notifications/audience/client');
      expect(res.status).toBe(200);
    });

    it('acepta BOTH', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/notifications/audience/BOTH');
      expect(res.status).toBe(200);
    });

    it('rechaza audiencia inválida', async () => {
      const res = await request(app).get('/api/notifications/audience/UNKNOWN');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/audience invalido/i);
    });
  });
});
