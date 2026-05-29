# SmartLogix - Plataforma de Gestion Logistica

**Equipo:** Jonah Bruzzi
**Repositorio:** https://github.com/JONAHBRUZZI/smartlogix

---

## 1. Resumen Ejecutivo

SmartLogix es una plataforma SaaS B2B multi-tenant para gestion logistica de PYMEs chilenas. Resuelve inventario, pedidos, despachos y trazabilidad en tiempo real usando una arquitectura de microservicios con Node.js, Express y PostgreSQL.

---

## 2. Estructura del Proyecto

```
SmartLogix/
├── Frontend/                     # SPA React + Vite + TypeScript (NPM)
├── Backend/
│   ├── orders-service/           # Microservicio Node.js :8081
│   ├── inventory-service/        # Microservicio Node.js :8082
│   ├── shipping-service/         # Microservicio Node.js :8084
│   ├── notification-service/     # Microservicio Node.js :8085
│   ├── nginx/                    # API Gateway (BFF)
│   ├── shared/                   # Modulos compartidos (db, logger, validate)
│   └── infrastructure/           # CloudFormation (AWS)
├── ENTREGABLE/                   # Documentacion del encargo
│   ├── analisis-patrones-arquetipos.md
│   ├── plan-branching.md
│   └── repositorios.txt
├── docker-compose.node.yml       # Dev con build local
├── docker-compose.vm.yml         # Produccion VM
└── docker-compose.optimized.yml  # Produccion optimizado
```

---

## 3. Tecnologias

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18, TypeScript 5.7, Vite 6, Tailwind CSS, shadcn/ui, PWA |
| Backend | Node.js 22, Express 4, pg (PostgreSQL) |
| API Gateway | Nginx Alpine (BFF) |
| Persistencia | PostgreSQL 15, 4 bases independientes |
| Infra | Docker Compose, Docker Hub, CloudFormation |
| CI/CD | Vercel (frontend), GitHub Actions, Docker Hub |

---

## 4. Despliegue

### Local
```bash
docker compose -f docker-compose.node.yml up -d
```

### VM (Produccion)
```bash
docker compose -f docker-compose.vm.yml up -d
```

### Frontend (Vercel)
```bash
cd Frontend && npx vercel --prod
```

---

## 5. Endpoints

| Servicio | Puerto | Principales rutas |
|----------|--------|------------------|
| orders-service | 8081 | POST/GET /api/orders, PUT /confirm, /cancel, /assign |
| inventory-service | 8082 | GET/POST /api/inventory, /adjust, GET/POST /api/sales |
| shipping-service | 8084 | POST/GET /api/shipments, PUT /stage, GET /qr |
| notification-service | 8085 | POST /api/notifications, GET /order/:id, /audience/:aud |
| API Gateway | 80 | Nginx reverse proxy a los 4 servicios |
