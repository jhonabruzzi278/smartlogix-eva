# SmartLogix - Plataforma de Gestion Logistica

**Repositorio:** https://github.com/JONAHBRUZZI/smartlogix
**VM:** http://104.248.60.29
**Frontend:** https://smartlogix-five.vercel.app

---

## Arquitectura

```
┌────────────────────────────────────────────────────┐
│ Frontend (React + Vite)    Vercel / :3000          │
├────────────────────────────────────────────────────┤
│ API Gateway (Nginx BFF)    :80                     │
├──────────┬──────────┬──────────┬───────────────────┤
│ orders   │ inventory│ shipping │ notification      │
│ Node.js  │ Node.js  │ Node.js  │ Node.js           │
│ :8081    │ :8082    │ :8084    │ :8085             │
├──────────┴──────────┴──────────┴───────────────────┤
│ PostgreSQL 15 (4 bases independientes)             │
└────────────────────────────────────────────────────┘
```

**Flujo:** orders → REST → inventory + shipping → REST → notification

---

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18, TypeScript 5.7, Vite 6, Tailwind, shadcn/ui, PWA |
| Backend | Node.js 22, Express 4, pg |
| BFF | Nginx Alpine (reverse proxy) |
| DB | PostgreSQL 15 Alpine, 4 bases (orders_db, inventory_db, shipping_db, notification_db) |
| Infra | Docker Compose, Docker Hub, Vercel, CloudFormation |
| RAM total | ~500 MB (6 contenedores) |

---

## Inicio rapido

```bash
# Clonar
git clone https://github.com/JONAHBRUZZI/smartlogix.git
cd SmartLogix

# Backend (local)
docker compose -f docker-compose.node.yml up -d

# Probar
curl http://localhost:80/healthz
curl http://localhost:80/api/orders/test

# Backup BD
docker exec smartlogix-db pg_dumpall -U postgres > backup.sql
```

---

## Despliegue VM

```bash
# En la VM (104.248.60.29)
cd ~/smartlogix && git pull
docker compose -f docker-compose.vm.yml down
docker compose -f docker-compose.vm.yml up -d
curl http://localhost:80/healthz
```

---

## Imagenes Docker Hub

| Servicio | Imagen |
|----------|--------|
| orders-service | `jonahbruzzi/orders-service:node` |
| inventory-service | `jonahbruzzi/inventory-service:node` |
| shipping-service | `jonahbruzzi/shipping-service:node` |
| notification-service | `jonahbruzzi/notification-service:node` |

---

## Endpoints API

### Orders (:8081)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/orders/test | Health check |
| POST | /api/orders | Crear orden |
| GET | /api/orders | Listar todas |
| PUT | /api/orders/:id/confirm | Confirmar (dispara flujo completo) |
| PUT | /api/orders/:id/cancel | Cancelar |
| PUT | /api/orders/:id/status?status=X | Cambiar estado |
| PUT | /api/orders/:id/assign?transporter=X | Asignar transportista |
| GET | /api/customers | Listar clientes |

### Inventory (:8082)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/inventory | Listar productos |
| GET | /api/inventory/:sku | Consultar SKU |
| POST | /api/inventory | Agregar producto |
| PUT | /api/inventory/:sku | Actualizar stock |
| POST | /api/inventory/:sku/adjust?delta=N | Ajustar +/- |
| GET | /api/sales | Listar ventas |
| POST | /api/sales | Registrar venta |

### Shipping (:8084)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/shipments | Listar envios |
| GET | /api/shipments/:orderId | Envio por orden |
| POST | /api/shipments | Crear envio + tracking |
| PUT | /api/shipments/:id/stage?stage=X | Cambiar etapa |
| GET | /api/shipments/:id/qr | Codigo QR |

### Notification (:8085)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/notifications | Persistir evento |
| GET | /api/notifications/order/:id | Trazabilidad de orden |
| GET | /api/notifications/audience/:aud | Por audiencia |

---

## Flujo de negocio completo

```bash
# 1. Crear orden
curl -s -X POST http://localhost:80/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"sku":"100001","quantity":3}'

# 2. Confirmar (ajusta stock + crea envio + notifica)
curl -s -X PUT http://localhost:80/api/orders/1/confirm

# 3. Ver trazabilidad
curl -s http://localhost:80/api/notifications/order/1 | python3 -m json.tool

# 4. Avanzar envio
curl -s -X PUT "http://localhost:80/api/shipments/1/stage?stage=EN_REPARTO"
curl -s -X PUT "http://localhost:80/api/shipments/1/stage?stage=ENTREGADO" \
  -H "Content-Type: application/json" \
  -d '{"customerCode":"C123"}'
```

---

## Estructura

```
SmartLogix/
├── Frontend/              # React SPA (NPM)
├── Backend/
│   ├── orders-service/    # Node.js :8081
│   ├── inventory-service/ # Node.js :8082
│   ├── shipping-service/  # Node.js :8084
│   ├── notification-service/ # Node.js :8085
│   ├── nginx/             # API Gateway config
│   ├── shared/            # db, logger, validate, shutdown
│   ├── infrastructure/    # CloudFormation AWS
│   ├── init-db.sql        # Creacion de bases
│   └── seed.sql           # Datos de prueba
├── ENTREGABLE/            # Documentacion encargo
├── docker-compose.node.yml
├── docker-compose.vm.yml
├── docker-compose.optimized.yml
└── docker-compose.prod.yml
```
