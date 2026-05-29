# SmartLogix Backend - Node.js

## Requisitos
- Docker y Docker Compose
- Node.js 22 (solo para desarrollo local sin Docker)

## Levantar en local
```bash
cd SmartLogix
docker compose -f docker-compose.node.yml up -d --build
curl http://localhost:80/healthz
```

## Levantar en VM (produccion)
```bash
docker compose -f docker-compose.vm.yml up -d
```

## Servicios
| Servicio | Puerto | DB | Descripcion |
|----------|--------|-----|-------------|
| orders-service | 8081 | orders_db | Pedidos |
| inventory-service | 8082 | inventory_db | Stock y ventas |
| shipping-service | 8084 | shipping_db | Envios |
| notification-service | 8085 | notification_db | Trazabilidad |
| nginx (BFF) | 80 | - | API Gateway |

## Endpoints principales
- `GET  /api/orders/test` - Health check
- `POST /api/orders` - Crear pedido
- `PUT  /api/orders/:id/confirm` - Confirmar (dispara flujo completo)
- `GET  /api/inventory` - Listar productos
- `POST /api/inventory/:sku/adjust?delta=-5` - Ajustar stock
- `GET  /api/shipments` - Listar envios
- `GET  /api/notifications/order/:id` - Trazabilidad de pedido

## Estructura de cada microservicio
```
service-name/
├── Dockerfile
├── package.json
└── src/
    └── index.js    # Express app con rutas REST
```

## Modulos compartidos
`Backend/shared/` contiene codigo reutilizado:
- `db.js` - Pool PostgreSQL
- `logger.js` - Logging estructurado
- `validate.js` - Validacion de entradas
- `shutdown.js` - Graceful shutdown
