# shipping-service

Microservicio de envios y tracking. Node.js 22 + Express 4 + PostgreSQL.

## Responsabilidad

Gestiona la creacion de envios, genera numeros de tracking, controla las etapas del despacho y notifica cambios de estado al servicio de notificaciones.

## Puerto

`8084` | Base de datos: `shipping_db`

## Dependencias

- express, pg, helmet, cors, express-rate-limit, uuid
- shared/ (app, db, logger, validate, security, shutdown)

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/shipments/test | Health check |
| GET | /api/shipments | Listar todos los envios |
| GET | /api/shipments/:orderId | Buscar envio por ID de orden |
| POST | /api/shipments | Crear envio `{orderId, customerId, sku, quantity}` |
| PUT | /api/shipments/:id/stage?stage=X | Cambiar etapa del envio |
| GET | /api/shipments/:id/qr | Obtener codigo QR del envio |

## Etapas (stages)

- `EN_PREPARACION` - En preparacion en bodega
- `EN_REPARTO` - En camino al cliente
- `ENTREGADO` - Entregado al destinatario
- `CANCELADO` - Envio cancelado

## Tracking

Al crear un envio, se genera automaticamente un numero de tracking con formato `TRACK-XXXXXXXX` (8 caracteres hexadecimales aleatorios).

## Comunicacion con otros servicios

Al cambiar la etapa de un envio (`PUT /stage`), este servicio notifica al notification-service:
- `POST /api/notifications` (notification-service) - Registra el evento de cambio de etapa

## Datos de entrega

Al marcar como `ENTREGADO`, se pueden registrar:
- `proofOfDeliveryImage` - Imagen de comprobante (base64)
- `recipientRut` - RUT del receptor
- `customerCode` - Codigo del cliente

## Ejecucion

### Con Docker (recomendado)

```bash
# Desde la raiz del proyecto
docker compose -f docker-compose.node.yml up -d --build
```

### Sin Docker (desarrollo)

```bash
cd Backend/shipping-service
npm install
DB_URL=postgresql://postgres:postgres@localhost:5432/shipping_db node src/index.js
```

## Variables de entorno

| Variable | Default | Descripcion |
|----------|---------|-------------|
| PORT | 8084 | Puerto HTTP |
| DB_URL | postgresql://postgres:postgres@postgres-db:5432/shipping_db | Conexion BD |
| NOTIFICATION_SERVICE_URL | http://notification-service:8085 | URL del servicio de notificaciones |
| ALLOWED_ORIGINS | * | CORS origins |
