# API Reference

Todos los endpoints expuestos por el API Gateway en `http://localhost:8080`.

---

## Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/healthz` | Estado del sistema |
| GET | `/api/orders/test` | Health check orders-service |
| GET | `/api/shipments/test` | Health check shipping-service |

---

## Orders

### Tracking público (sin autenticación)

```
GET /api/orders/track/:clientCode
```

Devuelve el estado del pedido asociado al código `SL-XXXXXX`. Solo campos seguros — sin email ni teléfono del cliente.

**Parámetros de ruta:** `clientCode` — formato `SL-XXXXXX` (case-insensitive)

**Respuesta 200:**
```json
{
  "id": 1,
  "sku": "COCA-2L",
  "quantity": 3,
  "status": "EN_PREPARACION",
  "created_at": "2026-06-20T14:30:00Z",
  "client_code": "SL-AB12CD",
  "cancel_reason": null,
  "customer_name": "María González"
}
```

**Respuesta 404:**
```json
{ "error": "Código de cliente no encontrado" }
```

---

### Listar órdenes

```
GET /api/orders
```

Requiere autenticación (JWT en header `Authorization: Bearer <token>`).  
Para roles `shipper`, `customer` y `vendor`, el campo `client_code` se omite del response.

**Query params opcionales:**
- `limit` (int) — registros por página
- `page` (int) — número de página

---

### Reporte de órdenes

```
GET /api/orders/report?status=CREATED
```

Ejecuta el stored procedure `fn_get_orders_with_customer`. Devuelve órdenes con datos del cliente (nombre, email).

**Query params:** `status` (opcional) — filtra por estado

---

### Detalle de orden

```
GET /api/orders/:id
```

`client_code` omitido para roles restringidos.

---

### Crear orden

```
POST /api/orders
Content-Type: application/json

{
  "customerId": 1,
  "sku": "COCA-2L",
  "quantity": 3
}
```

**Respuesta 201:**
```json
{
  "orderId": 1,
  "status": "CREATED",
  "sku": "COCA-2L",
  "quantity": 3,
  "customerId": 1,
  "customerCode": "SL-AB12CD",
  "message": "Orden creada correctamente",
  "createdAt": "2026-06-20T14:30:00Z"
}
```

---

### Confirmar orden (Saga)

```
PUT /api/orders/:id/confirm
```

Descuenta stock, crea envío y actualiza estado a `EN_PREPARACION`.  
Si algún paso falla, devuelve `warnings` pero la orden avanza.

---

### Cancelar orden

```
PUT /api/orders/:id/cancel
Content-Type: application/json

{ "reason": "Motivo de cancelación" }
```

Restaura stock y cancela envío si la orden estaba `EN_PREPARACION` o `EN_REPARTO`.

---

### Cambiar estado manualmente

```
PUT /api/orders/:id/status?status=EN_REPARTO
```

Estados válidos: `CREATED`, `EN_PREPARACION`, `EN_REPARTO`, `ENTREGADO`, `CANCELADO`

---

### Asignar transportista

```
PUT /api/orders/:id/assign?transporter=transportista1
```

---

### Eliminar orden

```
DELETE /api/orders/:id
```

---

## Customers

### Listar clientes

```
GET /api/customers
```

---

### Detalle de cliente

```
GET /api/customers/:id
```

---

### Crear cliente

```
POST /api/customers
Content-Type: application/json

{
  "name": "María González",
  "phone": "+56912345678",
  "address": "Av. Principal 123",
  "email": "maria@ejemplo.cl",
  "rut": "12.345.678-9"
}
```

---

### Actualizar cliente

```
PUT /api/customers/:id
Content-Type: application/json

{
  "name": "María González",
  "phone": "+56987654321",
  "address": "Nueva Dirección 456",
  "email": "nueva@ejemplo.cl",
  "rut": "12.345.678-9"
}
```

---

### Eliminar cliente

```
DELETE /api/customers/:id
```

---

## Inventory

### Listar productos

```
GET /api/inventory
```

---

### Reporte de inventario

```
GET /api/inventory/report
```

Ejecuta `fn_inventory_report()`. Devuelve productos clasificados por nivel de stock (crítico, bajo, normal).

---

### Consultar SKU

```
GET /api/inventory/:sku
```

---

### Agregar producto

```
POST /api/inventory
Content-Type: application/json

{ "sku": "COCA-2L", "stock": 100 }
```

---

### Actualizar stock

```
PUT /api/inventory/:sku
Content-Type: application/json

{ "stock": 150 }
```

---

### Eliminar producto

```
DELETE /api/inventory/:sku
```

---

### Ajustar stock (stored procedure)

```
POST /api/inventory/:sku/adjust?delta=-3
POST /api/inventory/:sku/adjust?delta=+5
```

`delta` puede ser positivo (ingreso) o negativo (egreso). La función valida que el stock no quede en negativo.

---

## Sales

### Listar ventas

```
GET /api/sales
```

---

### Registrar venta

```
POST /api/sales
Content-Type: application/json

{ "sku": "COCA-2L", "quantity": 2 }
```

Descuenta stock directamente (flujo POS, sin crear orden).

---

## Shipments

### Listar envíos

```
GET /api/shipments
```

---

### Envío por ID de orden

```
GET /api/shipments/:orderId
```

---

### Crear envío

```
POST /api/shipments
Content-Type: application/json

{
  "orderId": 1,
  "customerId": 1,
  "sku": "COCA-2L",
  "quantity": 3
}
```

**Respuesta 201:**
```json
{
  "id": 1,
  "order_id": 1,
  "tracking": "TRACK-A1B2C3D4",
  "stage": "EN_PREPARACION",
  "created_at": "..."
}
```

---

### Cambiar etapa del envío

```
PUT /api/shipments/:id/stage?stage=EN_REPARTO
```

Para `ENTREGADO`, incluir en el body:

```json
{
  "customerCode": "SL-AB12CD",
  "recipientRut": "12.345.678-9",
  "proofOfDeliveryImage": "data:image/jpeg;base64,..."
}
```

El sistema valida `customerCode` y `recipientRut` antes de aceptar el cambio.

**Etapas válidas:** `EN_PREPARACION`, `EN_REPARTO`, `ENTREGADO`, `CANCELADO`

---

### QR del envío

```
GET /api/shipments/:id/qr
```

Devuelve la imagen QR en formato PNG base64.

---

## Notifications

### Registrar evento

```
POST /api/notifications
Content-Type: application/json

{
  "orderId": 1,
  "event": "SHIPMENT_EN_REPARTO",
  "audience": "customer",
  "message": "Tu pedido está en camino"
}
```

---

### Trazabilidad de orden

```
GET /api/notifications/order/:id
```

Devuelve todos los eventos de una orden en orden cronológico.

---

### Notificaciones por audiencia

```
GET /api/notifications/audience/:audience
```

Audiencias: `customer`, `ops`, `shipper`, `system`

---

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado correctamente |
| 400 | Datos inválidos o validación fallida |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |
