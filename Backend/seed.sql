-- ============================================================
-- SmartLogix Seed - Negocio de Bebidas y Confites
-- Ejecutar DESPUES de docker compose up -d
-- Las tablas se crean automaticamente al iniciar los servicios Node.js
-- ============================================================

-- 1. Inventory: Bebidas y Confites -----------------------------
\c inventory_db

INSERT INTO inventory (id, sku, stock)
SELECT 1, 100001, 48 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 1);

INSERT INTO inventory (id, sku, stock)
SELECT 2, 100002, 72 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 2);

INSERT INTO inventory (id, sku, stock)
SELECT 3, 100003, 65 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 3);

INSERT INTO inventory (id, sku, stock)
SELECT 4, 100004, 120 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 4);

INSERT INTO inventory (id, sku, stock)
SELECT 5, 100005, 35 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 5);

INSERT INTO inventory (id, sku, stock)
SELECT 6, 100006, 90 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 6);

INSERT INTO inventory (id, sku, stock)
SELECT 7, 100007, 3 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 7);

INSERT INTO inventory (id, sku, stock)
SELECT 8, 100008, 15 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 8);

INSERT INTO inventory (id, sku, stock)
SELECT 9, 100009, 8 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 9);

INSERT INTO inventory (id, sku, stock)
SELECT 10, 100010, 2 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id = 10);

-- 2. Orders: pedidos de ejemplo --------------------------------
\c orders_db

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 1, 1, 100001, 6, 'EN_PREPARACION', '2026-05-18 09:15:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 1);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 2, 1, 100004, 12, 'EN_REPARTO', '2026-05-18 09:30:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 2);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 3, 2, 100007, 2, 'CREATED', '2026-05-18 10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 3);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 4, 1, 100010, 1, 'CANCELADO', '2026-05-18 10:22:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 4);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 5, 3, 100006, 24, 'EN_PREPARACION', '2026-05-18 11:05:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 5);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 6, 2, 100003, 8, 'CREATED', '2026-05-18 11:45:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 6);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 7, 1, 100005, 10, 'EN_REPARTO', '2026-05-18 12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 7);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 8, 3, 100001, 4, 'ENTREGADO', '2026-05-17 16:30:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 8);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 9, 2, 100009, 3, 'CANCELADO', '2026-05-18 08:50:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 9);

INSERT INTO orders (id, customer_id, sku, quantity, status, created_at)
SELECT 10, 1, 100002, 15, 'EN_PREPARACION', '2026-05-18 13:10:00'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = 10);

-- 3. Shipments: envios de pedidos confirmados ------------------
\c shipping_db

INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 1, 2, 1, 100004, 12, 'EN_REPARTO', 'TRK-7591A2', '2026-05-18 09:35:00', '2026-05-18 09:45:00'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 1);

INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 2, 7, 1, 100005, 10, 'EN_REPARTO', 'TRK-4820C3', '2026-05-18 12:05:00', '2026-05-18 12:15:00'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 2);

INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 3, 8, 3, 100001, 4, 'ENTREGADO', 'TRK-1265F7', '2026-05-17 16:35:00', '2026-05-17 17:10:00'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 3);

INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 4, 1, 1, 100001, 6, 'EN_PREPARACION', NULL, '2026-05-18 09:20:00', NULL
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 4);

INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 5, 5, 3, 100006, 24, 'EN_PREPARACION', NULL, '2026-05-18 11:10:00', NULL
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 5);

INSERT INTO shipments (id, order_id, customer_id, sku, quantity, status, tracking_number, created_at, shipped_at)
SELECT 6, 10, 1, 100002, 15, 'CANCELADO', 'TRK-9931H4', '2026-05-18 13:15:00', '2026-05-18 13:20:00'
WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE id = 6);

-- 4. Notification Records: trazabilidad de eventos -------------
\c notification_db

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 1, 'evt-001', 2, 1, 'Envio', 'EN_CAMINO', 'Pedido #2 despachado. Tracking TRK-7591A2', 'CLIENT', 'shipping-service', '2026-05-18 09:45:00', '2026-05-18 09:45:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 1);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 2, 'evt-002', 1, 1, 'Pedido', 'CONFIRMADO', 'Pedido #1 validado.', 'CLIENT', 'orders-service', '2026-05-18 09:16:00', '2026-05-18 09:16:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 2);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 3, 'evt-003', 4, 1, 'Pedido', 'RECHAZADO', 'Pedido #4 rechazado por stock insuficiente.', 'OPERATOR', 'inventory-service', '2026-05-18 10:23:00', '2026-05-18 10:23:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 3);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 4, 'evt-004', 8, 3, 'Envio', 'ENTREGADO', 'Pedido #8 entregado. Tracking TRK-1265F7', 'CLIENT', 'shipping-service', '2026-05-17 17:10:00', '2026-05-17 17:10:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 4);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 5, 'evt-005', 5, 3, 'Pedido', 'CONFIRMADO', 'Pedido #5 validado. 24 unidades de SKU 100006.', 'CLIENT', 'orders-service', '2026-05-18 11:06:00', '2026-05-18 11:06:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 5);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 6, 'evt-006', 10, 1, 'Envio', 'FALLIDO', 'Envio #6 fallo: direccion no encontrada.', 'OPERATOR', 'shipping-service', '2026-05-18 13:20:00', '2026-05-18 13:20:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 6);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 7, 'evt-007', 3, 2, 'Pedido', 'PENDIENTE', 'Pedido #3 esperando validacion.', 'CLIENT', 'orders-service', '2026-05-18 10:01:00', '2026-05-18 10:01:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 7);

INSERT INTO notification_records (id, event_id, order_id, customer_id, stage, status, message, target_audience, source_service, occurred_at, received_at)
SELECT 8, 'evt-008', 7, 1, 'Envio', 'EN_CAMINO', 'Pedido #7 en ruta de reparto local.', 'CLIENT', 'shipping-service', '2026-05-18 12:15:00', '2026-05-18 12:15:01'
WHERE NOT EXISTS (SELECT 1 FROM notification_records WHERE id = 8);

-- ============================================================
-- Productos:
--   100001 Coca-Cola 2L        (48 unids)
--   100002 Pepsi 2L            (72 unids)
--   100003 Sprite 2L           (65 unids)
--   100004 Agua Mineral 500ml  (120 unids)
--   100005 Jugo Watt's 1L      (35 unids)
--   100006 Cerveza Corona 355ml(90 unids)
--   100007 Chocolate Trencito  (3 unids)
--   100008 Galletas McKay       (15 unids)
--   100009 Papas Lays 200g     (8 unids)
--   100010 Chicles Frugele     (2 unids)
-- ============================================================
