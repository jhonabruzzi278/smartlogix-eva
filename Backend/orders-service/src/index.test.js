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

const mockOrder = {
  id: 1, customer_id: 10, sku: 'COCA-2L', quantity: 5,
  status: 'CREATED', created_at: new Date().toISOString(),
  assigned_to: null, cancel_reason: null
};
const mockCustomer = {
  id: 1, name: 'Juan Perez', phone: '999888777',
  address: 'Av. Lima 123', email: 'juan@example.com',
  created_at: new Date().toISOString()
};

describe('orders-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('')
    });
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

  describe('GET /api/orders/test', () => {
    it('retorna texto de bienvenida', async () => {
      const res = await request(app).get('/api/orders/test');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/orders-service UP/i);
    });
  });

  describe('POST /api/orders', () => {
    it('crea orden válida', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockOrder] });
      const res = await request(app).post('/api/orders')
        .send({ customerId: 10, sku: 'COCA-2L', quantity: 5 });
      expect(res.status).toBe(201);
      expect(res.body.orderId).toBe(1);
      expect(res.body.status).toBe('CREATED');
    });

    it('rechaza sin customerId', async () => {
      const res = await request(app).post('/api/orders').send({ sku: 'COCA-2L', quantity: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/customerId/i);
    });

    it('rechaza sin sku', async () => {
      const res = await request(app).post('/api/orders').send({ customerId: 10, quantity: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/sku/i);
    });

    it('rechaza quantity = 0', async () => {
      const res = await request(app).post('/api/orders')
        .send({ customerId: 10, sku: 'COCA-2L', quantity: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/quantity/i);
    });

    it('rechaza quantity negativa', async () => {
      const res = await request(app).post('/api/orders')
        .send({ customerId: 10, sku: 'COCA-2L', quantity: -3 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('retorna lista de órdenes', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockOrder] });
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].sku).toBe('COCA-2L');
    });

    it('retorna array vacío si no hay órdenes', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('actualiza status a EN_REPARTO', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'EN_REPARTO' }] });
      const res = await request(app).put('/api/orders/1/status?status=EN_REPARTO');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('EN_REPARTO');
    });

    it('acepta status en minúsculas (normaliza a uppercase)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'CREATED' }] });
      const res = await request(app).put('/api/orders/1/status?status=created');
      expect(res.status).toBe(200);
    });

    it('rechaza status inválido', async () => {
      const res = await request(app).put('/api/orders/1/status?status=INVALIDO');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Status invalido/i);
    });

    it('retorna 404 si orden no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/orders/999/status?status=EN_REPARTO');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/confirm (saga)', () => {
    it('confirma orden: descuenta inventario, crea envío, actualiza status', async () => {
      const confirmed = { ...mockOrder, status: 'EN_PREPARACION' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [confirmed] });
      const res = await request(app).put('/api/orders/1/confirm');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('EN_PREPARACION');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(res.body.warnings).toBeUndefined();
    });

    it('retorna 404 si la orden no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/orders/999/confirm');
      expect(res.status).toBe(404);
    });

    it('incluye warnings si inventario falla pero completa la saga', async () => {
      const confirmed = { ...mockOrder, status: 'EN_PREPARACION' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [confirmed] });
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Inventory unavailable'))
        .mockResolvedValueOnce({ ok: true });
      const res = await request(app).put('/api/orders/1/confirm');
      expect(res.status).toBe(200);
      expect(res.body.warnings).toBeDefined();
      expect(res.body.warnings[0]).toMatch(/Inventario/i);
    });

    it('incluye warnings si shipping falla pero completa la saga', async () => {
      const confirmed = { ...mockOrder, status: 'EN_PREPARACION' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [confirmed] });
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('Shipping unavailable'));
      const res = await request(app).put('/api/orders/1/confirm');
      expect(res.status).toBe(200);
      expect(res.body.warnings).toBeDefined();
      expect(res.body.warnings[0]).toMatch(/Envío/i);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('cancela orden en status CREATED sin restaurar stock', async () => {
      const cancelado = { ...mockOrder, status: 'CANCELADO', cancel_reason: 'Solicitud del cliente' };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'CREATED' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [cancelado] });
      const res = await request(app).put('/api/orders/1/cancel').send({ reason: 'Solicitud del cliente' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELADO');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('cancela orden EN_PREPARACION y restaura stock', async () => {
      const cancelado = { ...mockOrder, status: 'CANCELADO' };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'EN_PREPARACION' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [cancelado] });
      const res = await request(app).put('/api/orders/1/cancel').send({ reason: '' });
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retorna 404 si orden no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/orders/999/cancel').send({ reason: '' });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/assign', () => {
    it('asigna transportista a la orden', async () => {
      const asignada = { ...mockOrder, assigned_to: 'Repartidor 1' };
      mockQuery.mockResolvedValueOnce({ rows: [asignada] });
      const res = await request(app).put('/api/orders/1/assign?transporter=Repartidor+1');
      expect(res.status).toBe(200);
      expect(res.body.assigned_to).toBe('Repartidor 1');
    });

    it('rechaza sin parámetro transporter', async () => {
      const res = await request(app).put('/api/orders/1/assign');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/transporter/i);
    });

    it('retorna 404 si orden no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/orders/999/assign?transporter=x');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('elimina una orden existente', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockOrder] });
      const res = await request(app).delete('/api/orders/1');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminada/i);
    });

    it('retorna 404 si orden no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/orders/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/customers', () => {
    it('retorna lista de clientes', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCustomer] });
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Juan Perez');
    });

    it('retorna array vacío si no hay clientes', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('retorna cliente por ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCustomer] });
      const res = await request(app).get('/api/customers/1');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Juan Perez');
    });

    it('retorna 404 si cliente no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/customers/999');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no encontrado/i);
    });
  });

  describe('POST /api/customers', () => {
    it('crea cliente válido', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCustomer] });
      const res = await request(app).post('/api/customers').send({
        name: 'Juan Perez', phone: '999888777', address: 'Av. Lima 123', email: 'juan@example.com'
      });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Juan Perez');
    });

    it('rechaza sin nombre', async () => {
      const res = await request(app).post('/api/customers').send({ phone: '999' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/nombre/i);
    });

    it('rechaza nombre vacío (solo espacios)', async () => {
      const res = await request(app).post('/api/customers').send({ name: '   ' });
      expect(res.status).toBe(400);
    });

    it('crea cliente solo con nombre (campos opcionales)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Solo Nombre', phone: null, address: null, email: null }] });
      const res = await request(app).post('/api/customers').send({ name: 'Solo Nombre' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Solo Nombre');
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('actualiza cliente existente', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockCustomer, name: 'Juan Actualizado' }] });
      const res = await request(app).put('/api/customers/1').send({ name: 'Juan Actualizado' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Juan Actualizado');
    });

    it('rechaza actualización sin nombre', async () => {
      const res = await request(app).put('/api/customers/1').send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
    });

    it('retorna 404 si cliente no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/customers/999').send({ name: 'Nadie' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('elimina cliente existente', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCustomer] });
      const res = await request(app).delete('/api/customers/1');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminado/i);
    });

    it('retorna 404 si cliente no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/customers/999');
      expect(res.status).toBe(404);
    });
  });
});
