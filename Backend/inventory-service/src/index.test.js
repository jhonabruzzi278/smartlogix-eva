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

const mockProduct = { id: 1, sku: 'COCA-2L', stock: 50 };
const mockSale = { id: 1, sku: 'COCA-2L', quantity: 5, sale_date: new Date().toISOString() };

describe('inventory-service', () => {
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
    });
  });

  describe('GET /api/inventory', () => {
    it('retorna lista de productos', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockProduct] });
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].sku).toBe('COCA-2L');
    });

    it('retorna array vacío si no hay productos', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/inventory/:sku', () => {
    it('retorna producto por SKU', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockProduct] });
      const res = await request(app).get('/api/inventory/COCA-2L');
      expect(res.status).toBe(200);
      expect(res.body.sku).toBe('COCA-2L');
    });

    it('retorna 404 si SKU no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/inventory/NO-EXISTE');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/SKU no encontrado/i);
    });
  });

  describe('POST /api/inventory', () => {
    it('crea un producto válido', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockProduct] });
      const res = await request(app).post('/api/inventory').send({ sku: 'COCA-2L', stock: 50 });
      expect(res.status).toBe(201);
      expect(res.body.sku).toBe('COCA-2L');
    });

    it('rechaza body sin sku', async () => {
      const res = await request(app).post('/api/inventory').send({ stock: 10 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/sku/i);
    });

    it('rechaza body sin stock', async () => {
      const res = await request(app).post('/api/inventory').send({ sku: 'SKU-001' });
      expect(res.status).toBe(400);
    });

    it('retorna 409 si SKU ya existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app).post('/api/inventory').send({ sku: 'COCA-2L', stock: 50 });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/ya existe/i);
    });

    it('crea producto con stock 0', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 2, sku: 'NUEVO', stock: 0 }] });
      const res = await request(app).post('/api/inventory').send({ sku: 'NUEVO', stock: 0 });
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /api/inventory/:sku', () => {
    it('actualiza stock de un producto', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockProduct, stock: 100 }] });
      const res = await request(app).put('/api/inventory/COCA-2L').send({ stock: 100 });
      expect(res.status).toBe(200);
      expect(res.body.stock).toBe(100);
    });

    it('rechaza stock negativo', async () => {
      const res = await request(app).put('/api/inventory/COCA-2L').send({ stock: -5 });
      expect(res.status).toBe(400);
    });

    it('rechaza stock no numérico', async () => {
      const res = await request(app).put('/api/inventory/COCA-2L').send({ stock: 'mucho' });
      expect(res.status).toBe(400);
    });

    it('rechaza sin campo stock', async () => {
      const res = await request(app).put('/api/inventory/COCA-2L').send({});
      expect(res.status).toBe(400);
    });

    it('retorna 404 si SKU no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/inventory/NO-EXISTE').send({ stock: 10 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/inventory/:sku', () => {
    it('elimina un producto por SKU', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockProduct] });
      const res = await request(app).delete('/api/inventory/COCA-2L');
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(res.body.sku).toBe('COCA-2L');
    });

    it('retorna 404 si SKU no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/inventory/NO-EXISTE');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/inventory/:sku/adjust (usa fn_adjust_stock)', () => {
    const spOk = (sku, stock, delta) => ({
      sku_out: sku, new_stock: stock, delta, success: true, error_msg: null
    });
    const spFail = (sku, delta, msg) => ({
      sku_out: sku, new_stock: null, delta, success: false, error_msg: msg
    });

    it('incrementa stock correctamente (delta positivo)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [spOk('COCA-2L', 60, 10)] });
      const res = await request(app).post('/api/inventory/COCA-2L/adjust?delta=10');
      expect(res.status).toBe(200);
      expect(res.body.delta).toBe(10);
      expect(res.body.stock).toBe(60);
    });

    it('decrementa stock y registra venta (delta negativo)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [spOk('COCA-2L', 45, -5)] })
        .mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/inventory/COCA-2L/adjust?delta=-5');
      expect(res.status).toBe(200);
      expect(res.body.delta).toBe(-5);
      expect(res.body.stock).toBe(45);
    });

    it('rechaza delta cero (sin llamar al SP)', async () => {
      const res = await request(app).post('/api/inventory/COCA-2L/adjust?delta=0');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/non-zero/i);
    });

    it('rechaza delta no numérico', async () => {
      const res = await request(app).post('/api/inventory/COCA-2L/adjust?delta=abc');
      expect(res.status).toBe(400);
    });

    it('retorna 400 si stock insuficiente (SP retorna success=false)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [spFail('COCA-2L', -100, 'Stock insuficiente')] });
      const res = await request(app).post('/api/inventory/COCA-2L/adjust?delta=-100');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/insuficiente/i);
    });

    it('retorna 404 si SKU no existe (SP retorna success=false)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [spFail('NO-EXISTE', -5, 'SKU no encontrado')] });
      const res = await request(app).post('/api/inventory/NO-EXISTE/adjust?delta=-5');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no encontrado/i);
    });
  });

  describe('GET /api/inventory/report (usa fn_get_inventory_report)', () => {
    it('retorna reporte con clasificación de stock', async () => {
      const mockReport = [
        { sku: 'COCA-2L', stock: 0, stock_level: 'SIN_STOCK' },
        { sku: 'AGUA-500', stock: 5, stock_level: 'CRITICO' },
        { sku: 'JUGO-1L', stock: 50, stock_level: 'NORMAL' }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockReport });
      const res = await request(app).get('/api/inventory/report');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].stock_level).toBe('SIN_STOCK');
      expect(res.body[2].stock_level).toBe('NORMAL');
    });

    it('retorna array vacío si no hay inventario', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/inventory/report');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/sales', () => {
    it('retorna lista de ventas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockSale] });
      const res = await request(app).get('/api/sales');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('retorna array vacío si no hay ventas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/sales');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/sales', () => {
    it('registra venta válida', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockProduct, stock: 45 }] })
        .mockResolvedValueOnce({ rows: [mockSale] });
      const res = await request(app).post('/api/sales').send({ sku: 'COCA-2L', quantity: 5 });
      expect(res.status).toBe(201);
      expect(res.body.sku).toBe('COCA-2L');
    });

    it('rechaza sin sku', async () => {
      const res = await request(app).post('/api/sales').send({ quantity: 5 });
      expect(res.status).toBe(400);
    });

    it('rechaza sin quantity', async () => {
      const res = await request(app).post('/api/sales').send({ sku: 'COCA-2L' });
      expect(res.status).toBe(400);
    });

    it('retorna 400 por stock insuficiente', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app).post('/api/sales').send({ sku: 'COCA-2L', quantity: 999 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/insuficiente/i);
    });

    it('retorna 404 si SKU no existe', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/sales').send({ sku: 'NO-EXISTE', quantity: 1 });
      expect(res.status).toBe(404);
    });
  });
});
