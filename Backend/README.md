# SmartLogix Backend

Microservicios Node.js 22 con Express 4 y PostgreSQL 15.

## Requisitos

- Docker y Docker Compose
- Node.js 22 (solo para desarrollo sin Docker)

## Levantar en local (desarrollo)

```bash
cd SmartLogix
docker compose -f docker-compose.node.yml up -d --build
curl http://localhost:80/healthz
```

## Levantar en VM (produccion)

```bash
cd ~/smartlogix
docker compose -f docker-compose.vm.yml up -d
curl http://localhost:80/healthz
```

## Servicios

| Servicio | Puerto | Base de datos | Responsabilidad |
|----------|--------|---------------|-----------------|
| orders-service | 8081 | orders_db | Gestion de pedidos |
| inventory-service | 8082 | inventory_db | Control de stock y ventas |
| shipping-service | 8084 | shipping_db | Envios y tracking |
| notification-service | 8085 | notification_db | Trazabilidad y auditoria |
| nginx (BFF) | 80 | - | API Gateway / reverse proxy |

## Estructura de cada microservicio

```
servicio/
├── Dockerfile         # Node.js 22 Alpine
├── package.json       # Dependencias npm
└── src/
    └── index.js       # App Express con rutas REST
```

## Modulos compartidos (shared/)

El directorio `Backend/shared/` contiene codigo reutilizado por todos los servicios:

| Modulo | Funcion |
|--------|---------|
| `app.js` | Fabrica de apps Express (config, CORS, graceful shutdown) |
| `db.js` | Pool de conexiones PostgreSQL |
| `logger.js` | Logging estructurado con niveles |
| `validate.js` | Validacion de entradas (ordenes, estados, etc.) |
| `security.js` | Helmet, CORS, rate limiting |

## Comunicacion entre servicios

La comunicacion es sincrona via REST usando `interServiceFetch()` definido en `shared/app.js`. El flujo principal:

```
POST /api/orders (crear)
  └── PUT /api/orders/:id/confirm
        ├── POST /api/inventory/:sku/adjust?delta=-N  (descuenta stock)
        ├── POST /api/shipments                       (crea envio)
        └── (shipping-service notifica a notification-service al cambiar etapa)
```

## Inicializacion de bases de datos

`init-db.sql` crea las 4 bases PostgreSQL:
```sql
CREATE DATABASE orders_db;
CREATE DATABASE inventory_db;
CREATE DATABASE shipping_db;
CREATE DATABASE notification_db;
```

Cada servicio crea sus propias tablas en el arranque via `ensureTables()`.

## Datos de prueba

`seed.sql` contiene 10 productos, 10 pedidos, 6 envios y 8 notificaciones de ejemplo (negocio de bebidas y snacks).
