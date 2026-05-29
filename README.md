# SmartLogix - Plataforma de Gestion Logistica

**Repositorio principal:** https://github.com/JONAHBRUZZI/smartlogix
**Backend (VM):** http://104.248.60.29
**Frontend (Vercel):** https://smartlogix-five.vercel.app

---

## Arquitectura

```
+----------------------------------------------+
| Frontend (React + Vite)    Vercel / :3000     |
+----------------------------------------------+
| API Gateway / BFF (Nginx)  :80                |
+----------+-----------+-----------+-----------+
| orders   | inventory | shipping  | notif.    |
| Node.js  | Node.js   | Node.js   | Node.js   |
| :8081    | :8082     | :8084     | :8085     |
+----------+-----------+-----------+-----------+
| PostgreSQL 15 (4 bases independientes)        |
+----------------------------------------------+
```

**Flujo de negocio:** orders --REST--> inventory + shipping --REST--> notification

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18, TypeScript 5.7, Vite 6, Tailwind CSS, shadcn/ui, PWA |
| BFF | Nginx Alpine (reverse proxy) |
| Microservicios | Node.js 22, Express 4, pg (PostgreSQL) |
| Base de datos | PostgreSQL 15 Alpine, 1 DB por servicio |
| Infraestructura | Docker Compose, Docker Hub, Vercel, VM DigitalOcean |
| RAM total | ~500 MB (6 contenedores) |

---

## Inicio rapido

```bash
# Clonar
git clone https://github.com/JONAHBRUZZI/smartlogix.git
cd SmartLogix

# Backend (Docker Compose)
docker compose -f docker-compose.node.yml up -d --build

# Verificar
curl http://localhost:80/healthz
curl http://localhost:80/api/orders/test
```

---

## Despliegue en VM

```bash
# En la VM de produccion
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
| PUT | /api/orders/:id/confirm | Confirmar (flujo completo) |
| PUT | /api/orders/:id/cancel | Cancelar orden |
| PUT | /api/orders/:id/status?status=X | Cambiar estado |
| PUT | /api/orders/:id/assign?transporter=X | Asignar transportista |
| DELETE | /api/orders/:id | Eliminar orden |
| GET | /api/customers | Listar clientes |

### Inventory (:8082)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/inventory | Listar productos |
| GET | /api/inventory/:sku | Consultar SKU |
| POST | /api/inventory | Agregar producto |
| DELETE | /api/inventory/:sku | Eliminar producto |
| POST | /api/inventory/:sku/adjust?delta=N | Ajustar stock |
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

## Flujo de negocio (ejemplo con curl)

```bash
# 1. Crear orden
curl -X POST http://localhost:80/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"sku":"100001","quantity":3}'

# 2. Confirmar (ajusta stock + crea envio + notifica)
curl -X PUT http://localhost:80/api/orders/1/confirm

# 3. Trazabilidad completa
curl http://localhost:80/api/notifications/order/1 | python3 -m json.tool

# 4. Avanzar envio hasta entregado
curl -X PUT "http://localhost:80/api/shipments/1/stage?stage=EN_REPARTO"
curl -X PUT "http://localhost:80/api/shipments/1/stage?stage=ENTREGADO" \
  -H "Content-Type: application/json" \
  -d '{"customerCode":"C123"}'
```

---

## Estructura del proyecto

```
SmartLogix/
├── Frontend/                  # React SPA (NPM)
├── Backend/
│   ├── orders-service/        # Node.js Express :8081
│   ├── inventory-service/     # Node.js Express :8082
│   ├── shipping-service/      # Node.js Express :8084
│   ├── notification-service/  # Node.js Express :8085
│   ├── nginx/                 # Config BFF (API Gateway)
│   ├── shared/                # db, logger, validate, shutdown
│   ├── init-db.sql            # Creacion de 4 bases de datos
│   └── seed.sql               # Datos de prueba
├── docker-compose.node.yml    # Desarrollo (build local)
└── docker-compose.vm.yml      # Produccion (imagenes Docker Hub)
```
