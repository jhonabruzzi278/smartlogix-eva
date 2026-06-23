# SmartLogix - Plataforma de Gestion Logistica

**Repositorio:** https://github.com/jhonabruzzi278/smartlogix-eva
**Frontend (Vercel):** https://smartlogix-five.vercel.app

---

## Arquitectura

```
+----------------------------------------------+
| Frontend (React + Vite)    localhost:3000     |
+----------------------------------------------+
| API Gateway / BFF (Nginx)  localhost:8080     |
+----------+-----------+-----------+-----------+
| orders   | inventory | shipping  | notif.    |
| Node.js  | Node.js   | Node.js   | Node.js   |
| :8081    | :8082     | :8084     | :8085     |
+----------+-----------+-----------+-----------+
| PostgreSQL 15 (4 bases independientes) :5432  |
+----------------------------------------------+
```

**Flujo de negocio:** orders --REST--> inventory + shipping --REST--> notification

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18, TypeScript 5.7, Vite 6, Tailwind CSS, shadcn/ui, PWA |
| BFF | Nginx Alpine (reverse proxy, port 8080) |
| Microservicios | Node.js 22, Express 4, pg (PostgreSQL driver) |
| Base de datos | PostgreSQL 15 Alpine, 1 DB por servicio |
| Infraestructura | Docker Desktop, Docker Compose |

---

## Inicio rapido (Docker Desktop)

### Requisitos

- Docker Desktop instalado y corriendo
- Node.js 22 (solo para el frontend en desarrollo)

### 1. Levantar el backend completo

```bash
# Desde la raiz del proyecto
docker compose up -d --build

# Verificar que todos los contenedores esten corriendo
docker compose ps
```

Los contenedores que se levantan:

| Contenedor | Puerto local | Descripcion |
|-----------|-------------|-------------|
| smartlogix-db | 5432 | PostgreSQL (4 DBs) |
| smartlogix-orders | 8081 | orders-service |
| smartlogix-inventory | 8082 | inventory-service |
| smartlogix-shipping | 8084 | shipping-service |
| smartlogix-notification | 8085 | notification-service |
| smartlogix-api-gateway | **8080** | Nginx BFF (punto unico de entrada) |

### 2. Verificar que el backend este activo

```bash
# Health check del BFF
curl http://localhost:8080/healthz

# Test del orders-service
curl http://localhost:8080/api/orders/test
```

### 3. Levantar el frontend en desarrollo

```bash
cd Frontend
npm install
npm run dev
# Abre http://localhost:3000
```

El proxy de Vite redirige automaticamente `/api/*` a `http://localhost:8080`.

---

## Comandos Docker utiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio especifico
docker compose logs -f orders-service

# Detener todos los contenedores
docker compose down

# Detener y eliminar volumen (borra datos BD)
docker compose down -v

# Reconstruir un servicio especifico
docker compose up -d --build orders-service
```

---

## Puertos expuestos

| Servicio | Puerto | Uso |
|---------|--------|-----|
| Nginx BFF | 8080 | API Gateway - usar para Postman y frontend |
| orders-service | 8081 | Acceso directo (debug) |
| inventory-service | 8082 | Acceso directo (debug) |
| shipping-service | 8084 | Acceso directo (debug) |
| notification-service | 8085 | Acceso directo (debug) |
| PostgreSQL | 5432 | Conexion directa a BD (TablePlus, pgAdmin) |

**Usar siempre el BFF (8080)** para requests normales. Los puertos directos son para debug.

---

## Endpoints API (via BFF :8080)

### Orders

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /healthz | Health check del BFF |
| GET | /api/orders/test | Test del orders-service |
| POST | /api/orders | Crear orden `{customerId, sku, quantity}` |
| GET | /api/orders | Listar todas las ordenes |
| GET | /api/orders/report | Reporte con datos de cliente (SP) |
| PUT | /api/orders/:id/confirm | Confirmar (Saga: stock + envio) |
| PUT | /api/orders/:id/cancel | Cancelar `{reason}` |
| PUT | /api/orders/:id/status?status=X | Cambiar estado |
| PUT | /api/orders/:id/assign?transporter=X | Asignar transportista |
| DELETE | /api/orders/:id | Eliminar orden |
| GET | /api/customers | Listar clientes |
| POST | /api/customers | Crear cliente |
| PUT | /api/customers/:id | Actualizar cliente |
| DELETE | /api/customers/:id | Eliminar cliente |

### Inventory

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/inventory | Listar productos |
| GET | /api/inventory/report | Reporte clasificado por nivel stock (SP) |
| GET | /api/inventory/:sku | Consultar SKU |
| POST | /api/inventory | Agregar producto `{sku, stock}` |
| PUT | /api/inventory/:sku | Actualizar stock `{stock}` |
| DELETE | /api/inventory/:sku | Eliminar producto |
| POST | /api/inventory/:sku/adjust?delta=N | Ajustar stock (SP) |
| GET | /api/sales | Listar ventas |
| POST | /api/sales | Registrar venta `{sku, quantity}` |

### Shipping

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/shipments | Listar envios |
| GET | /api/shipments/:orderId | Envio por orden |
| POST | /api/shipments | Crear envio + tracking |
| PUT | /api/shipments/:id/stage?stage=X | Cambiar etapa |
| GET | /api/shipments/:id/qr | Codigo QR |

### Notifications

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/notifications | Persistir evento |
| GET | /api/notifications/order/:id | Trazabilidad de orden |
| GET | /api/notifications/audience/:aud | Por audiencia |

---

## Flujo de negocio completo (ejemplo)

```bash
# 1. Crear cliente
curl -X POST http://localhost:8080/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Perez","phone":"999888777","address":"Av. Lima 123"}'

# 2. Agregar producto al inventario
curl -X POST http://localhost:8080/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"sku":"COCA-2L","stock":100}'

# 3. Crear orden
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"sku":"COCA-2L","quantity":3}'

# 4. Confirmar orden (descuenta stock + crea envio + notifica)
curl -X PUT http://localhost:8080/api/orders/1/confirm

# 5. Avanzar etapa del envio
curl -X PUT "http://localhost:8080/api/shipments/1/stage?stage=EN_REPARTO"
curl -X PUT "http://localhost:8080/api/shipments/1/stage?stage=ENTREGADO"

# 6. Ver trazabilidad completa
curl http://localhost:8080/api/notifications/order/1

# 7. Ver reporte de ordenes
curl http://localhost:8080/api/orders/report
```

---

## Pruebas unitarias

```bash
# Frontend (desde carpeta Frontend/)
npm test
npm run test:coverage   # Genera reporte en Frontend/coverage/index.html

# Backend (desde carpeta de cada microservicio)
cd Backend/orders-service && npm test -- --coverage
cd Backend/inventory-service && npm test -- --coverage
cd Backend/shipping-service && npm test -- --coverage
cd Backend/notification-service && npm test -- --coverage
```

---

## Estructura del proyecto

```
SmartLogix/
├── Frontend/                  # React 18 SPA + PWA (Vite)
├── Backend/
│   ├── orders-service/        # Node.js Express :8081
│   ├── inventory-service/     # Node.js Express :8082
│   ├── shipping-service/      # Node.js Express :8084
│   ├── notification-service/  # Node.js Express :8085
│   ├── nginx/                 # Config BFF (API Gateway :8080)
│   ├── shared/                # db, logger, validate, shutdown, security
│   └── init-db.sql            # Creacion de 4 bases de datos
├── ENTREGABLE/                # Documentacion de la rubrica
└── docker-compose.yml         # Orquestacion completa (Docker Desktop)
```
