# orders-service

Microservicio de gestion de pedidos. Node.js 22 + Express 4 + PostgreSQL.

## Responsabilidad

Gestiona el ciclo de vida completo de los pedidos: creacion, confirmacion (orquestacion), cancelacion, asignacion de transportista y eliminacion.

## Puerto

`8081` | Base de datos: `orders_db`

## Dependencias

- express, pg, helmet, cors, express-rate-limit, uuid
- shared/ (app, db, logger, validate, security, shutdown)

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/orders/test | Health check |
| POST | /api/orders | Crear pedido `{customerId, sku, quantity}` |
| GET | /api/orders | Listar todos los pedidos |
| PUT | /api/orders/:id/confirm | Confirmar: descuenta stock + crea envio |
| PUT | /api/orders/:id/cancel | Cancelar `{reason}`. Restaura stock si estaba en preparacion |
| PUT | /api/orders/:id/status?status=X | Cambiar estado manualmente |
| PUT | /api/orders/:id/assign?transporter=X | Asignar transportista |
| DELETE | /api/orders/:id | Eliminar pedido |
| GET | /api/customers | Listar clientes |

## Estados

- `CREATED` - Pedido creado, pendiente de confirmacion
- `EN_PREPARACION` - Confirmado, stock descontado, envio generado
- `EN_REPARTO` - En camino al cliente
- `ENTREGADO` - Entregado exitosamente
- `CANCELADO` - Cancelado (con motivo)

## Comunicacion con otros servicios

Al confirmar un pedido (`PUT /confirm`), este servicio orquesta:

1. `POST /api/inventory/:sku/adjust?delta=-N` (inventory-service) - Descuenta stock
2. `POST /api/shipments` (shipping-service) - Crea el envio
3. Actualiza estado a `EN_PREPARACION`

Al cancelar un pedido en preparacion, restaura el stock:
1. `POST /api/inventory/:sku/adjust?delta=+N` (inventory-service) - Restaura stock

## Ejecucion

### Con Docker (recomendado)

```bash
# Desde la raiz del proyecto
docker compose -f docker-compose.node.yml up -d --build
```

### Sin Docker (desarrollo)

```bash
cd Backend/orders-service
npm install
DB_URL=postgresql://postgres:postgres@localhost:5432/orders_db node src/index.js
```

## Variables de entorno

| Variable | Default | Descripcion |
|----------|---------|-------------|
| PORT | 8081 | Puerto HTTP |
| DB_URL | postgresql://postgres:postgres@postgres-db:5432/orders_db | Conexion BD |
| INVENTORY_SERVICE_URL | http://inventory-service:8082 | URL del servicio de inventario |
| SHIPPING_SERVICE_URL | http://shipping-service:8084 | URL del servicio de envios |
| ALLOWED_ORIGINS | * | CORS origins |
