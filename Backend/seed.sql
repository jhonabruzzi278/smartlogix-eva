-- ============================================================
-- SmartLogix Seed - 4 productos, flujo logístico realista
-- Ejecutar: docker exec -i smartlogix-db psql -U postgres < seed.sql
-- Idempotente: no duplica datos si ya existen
-- ============================================================

-- 1. INVENTARIO: 4 productos de tecnología --------------------
\c inventory_db

INSERT INTO inventory (sku, stock, name, price, cost, category)
SELECT 'LAPTOP-HP-15', 25, 'Laptop HP 15"', 450000, 290000, 'otros'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'LAPTOP-HP-15');

INSERT INTO inventory (sku, stock, name, price, cost, category)
SELECT 'MONITOR-DELL-24', 40, 'Monitor Dell 24"', 180000, 115000, 'otros'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'MONITOR-DELL-24');

INSERT INTO inventory (sku, stock, name, price, cost, category)
SELECT 'TECLADO-LOGI', 60, 'Teclado Logitech', 25000, 16000, 'otros'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'TECLADO-LOGI');

INSERT INTO inventory (sku, stock, name, price, cost, category)
SELECT 'MOUSE-LOGI', 80, 'Mouse Logitech', 15000, 9500, 'otros'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'MOUSE-LOGI');

-- 2. CLIENTES -------------------------------------------------
\c orders_db

INSERT INTO customers (name, phone, address, email, created_at)
SELECT 'Distribuidora El Sol', '+56912345678', 'Av. Providencia 1234, Santiago', 'ventas@elsol.cl', NOW()
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'ventas@elsol.cl');

INSERT INTO customers (name, phone, address, email, created_at)
SELECT 'Comercial Andina Ltda', '+56987654321', 'Calle Los Olivos 567, Maipu', 'contacto@andina.cl', NOW()
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'contacto@andina.cl');

INSERT INTO customers (name, phone, address, email, created_at)
SELECT 'Importadora Pacifico', '+56911223344', 'Av. Las Condes 890, Las Condes', 'info@pacifico.cl', NOW()
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'info@pacifico.cl');

INSERT INTO customers (name, phone, address, email, created_at)
SELECT 'Cliente Demo', '+56999888777', 'Calle Demo 123, Santiago', 'cliente@smartlogix.cl', NOW()
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'cliente@smartlogix.cl');

-- 3. PEDIDOS: uno en cada estado del flujo --------------------

-- Cliente 1: pedido pendiente de confirmacion
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 101, 1, 'LAPTOP-HP-15', 2, 'CREATED', NOW() - INTERVAL '10 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 101);

-- Cliente 2: pedido confirmado, en preparacion
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 102, 2, 'MONITOR-DELL-24', 3, 'EN_PREPARACION', NOW() - INTERVAL '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 102);

-- Cliente 3: pedido en reparto
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at, assigned_to)
SELECT 103, 3, 'TECLADO-LOGI', 5, 'EN_REPARTO', NOW() - INTERVAL '1 hour', 'shipper01'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 103);

-- Cliente 1: pedido entregado
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at, assigned_to)
SELECT 104, 1, 'MOUSE-LOGI', 10, 'ENTREGADO', NOW() - INTERVAL '3 hours', 'shipper01'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 104);

-- Cliente 2: pedido cancelado
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at, cancel_reason)
SELECT 105, 2, 'TECLADO-LOGI', 1, 'CANCELADO', NOW() - INTERVAL '45 minutes', 'Cliente solicito cancelacion'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 105);

-- Cliente 4 (Cliente Demo): pedido en preparacion para test
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 106, 4, 'MONITOR-DELL-24', 1, 'EN_PREPARACION', NOW() - INTERVAL '15 minutes'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 106);

-- Cliente 4 (Cliente Demo): pedido entregado
INSERT INTO orders (id, customer_id, sku, quantity, status, created_at, assigned_to)
SELECT 107, 4, 'MOUSE-LOGI', 2, 'ENTREGADO', NOW() - INTERVAL '2 hours', 'shipper01'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 107);

-- 3. ENVIOS: tracking para pedidos confirmados ----------------
\c shipping_db

-- Envio del pedido 103 (en reparto)
INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 201, 103, 3, 'TECLADO-LOGI', 5, 'EN_REPARTO', 'TRACK-A1B2C3D4', NOW() - INTERVAL '55 minutes', NOW() - INTERVAL '50 minutes'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 201);

-- Envio del pedido 104 (entregado)
INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at, customer_code, recipient_rut)
SELECT 202, 104, 1, 'MOUSE-LOGI', 10, 'ENTREGADO', 'TRACK-E5F6G7H8', NOW() - INTERVAL '2 hours 55 minutes', NOW() - INTERVAL '2 hours', 'CUST-001', '12345678-9'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 202);

-- Envio del pedido 107 (cliente demo, entregado)
INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at, customer_code, recipient_rut)
SELECT 203, 107, 4, 'MOUSE-LOGI', 2, 'ENTREGADO', 'TRACK-DEMO001', NOW() - INTERVAL '1 hour 55 minutes', NOW() - INTERVAL '1 hour', 'CUST-DEMO', '99888777-7'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 203);

-- Envio en preparacion (para probar boton Retirar)
INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at)
SELECT 204, 106, 4, 'MONITOR-DELL-24', 1, 'EN_PREPARACION', 'TRACK-DEMO002', NOW() - INTERVAL '10 minutes'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 204);

-- 4. NOTIFICACIONES: trazabilidad de eventos ------------------
\c notification_db

-- Pedido 101 creado
INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 301, 'seed-101-created', 101, 1, 'Pedido', 'CREADO', 'Pedido #101 registrado: 2x LAPTOP-HP-15', 'OPERATOR', 'orders-service', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 301);

-- Pedido 102 confirmado
INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 302, 'seed-102-confirmed', 102, 2, 'Pedido', 'CONFIRMADO', 'Pedido #102 validado: 3x MONITOR-DELL-24', 'OPERATOR', 'orders-service', NOW() - INTERVAL '29 minutes', NOW() - INTERVAL '29 minutes'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 302);

-- Pedido 103 en reparto
INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 303, 'seed-103-transit', 103, 3, 'Envio', 'EN_CAMINO', 'Pedido #103 en ruta. Tracking TRACK-A1B2C3D4', 'CLIENT', 'shipping-service', NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 303);

-- Pedido 104 entregado
INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 304, 'seed-104-delivered', 104, 1, 'Envio', 'ENTREGADO', 'Pedido #104 entregado. Recibido por cliente CUST-001', 'CLIENT', 'shipping-service', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 304);

-- Pedido 105 cancelado
INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 305, 'seed-105-cancelled', 105, 2, 'Pedido', 'CANCELADO', 'Pedido #105 cancelado: Cliente solicito cancelacion', 'OPERATOR', 'orders-service', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 305);

-- Pedido 106 (demo) creado y en preparacion
INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 306, 'seed-106-created', 106, 4, 'Pedido', 'CREADO', 'Pedido #106 registrado: 1x MONITOR-DELL-24', 'OPERATOR', 'orders-service', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 306);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 307, 'seed-106-shipment', 106, 4, 'Envio', 'EN_PREPARACION', 'Envio creado tracking TRACK-DEMO002. Listo para retiro en tienda.', 'CLIENT', 'shipping-service', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 307);

-- ============================================================
-- Resumen de datos sembrados
-- ============================================================
-- Productos (4):
--   LAPTOP-HP-15     Laptop HP 15"        25 unids
--   MONITOR-DELL-24  Monitor Dell 24"     40 unids
--   TECLADO-LOGI     Teclado Logitech     60 unids
--   MOUSE-LOGI       Mouse Logitech       80 unids
--
-- Pedidos (5, uno por estado):
--   #101  CREATED         LAPTOP-HP-15    x2   Cliente 1
--   #102  EN_PREPARACION  MONITOR-DELL-24 x3   Cliente 2
--   #103  EN_REPARTO      TECLADO-LOGI    x5   Cliente 3 (shipper01)
--   #104  ENTREGADO       MOUSE-LOGI      x10  Cliente 1 (shipper01)
--   #105  CANCELADO       TECLADO-LOGI    x1   Cliente 2
--
-- Envios (2):
--   #201  TRACK-A1B2C3D4  Pedido #103  EN_REPARTO
--   #202  TRACK-E5F6G7H8  Pedido #104  ENTREGADO  CUST-001 / 12345678-9
--
-- Notificaciones (5):
--   301  Pedido 101 creado
--   302  Pedido 102 confirmado
--   303  Pedido 103 en reparto
--   304  Pedido 104 entregado
--   305  Pedido 105 cancelado
-- ============================================================
