# SmartLogix

Plataforma de gestión logística para PYMEs — inventario, pedidos, envíos y notificaciones en tiempo real.

> **Caso real:** Negocio "Don Juan – Bebidas y Confites" (10 SKUs, 3 clientes, reparto local).

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│ Frontend — React 18 + Vite + Tailwind + PWA         │
│ Despliegue: Vercel / S3 + CloudFront                │
├─────────────────────────────────────────────────────┤
│ API Gateway — Nginx (reverse proxy, TLS, rate limit)│
│ Despliegue: EC2 / ALB                               │
├──────────┬──────────┬──────────┬────────────────────┤
│ orders   │ inventory│ shipping │ notification       │
│ Spring   │ Spring   │ Spring   │ Spring Boot 3.5.11 │
│ Boot 3.4 │ Boot 3.5 │ Boot 3.5 │ Java 21            │
│ :8081    │ :8082    │ :8084    │ :8085              │
├──────────┴──────────┴──────────┴────────────────────┤
│ identity-service (Company, Role, User) :8083         │
├─────────────────────────────────────────────────────┤
│ RDS PostgreSQL — 5 bases, una por bounded context   │
├─────────────────────────────────────────────────────┤
│ SQS + SNS — mensajería asíncrona y fan-out          │
├─────────────────────────────────────────────────────┤
│ S3 + Glue + Redshift + QuickSight — analítica y BI  │
└─────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18, TypeScript 5.7, Vite 6, Tailwind CSS 3, shadcn, PWA |
| **Backend** | Java 21, Spring Boot 3.5, JPA, Actuator, CloudWatch |
| **Mensajería** | AWS SQS, SNS (LocalStack en dev) |
| **Persistencia** | PostgreSQL 15 (5 bases: orders, inventory, shipping, notification, identity) |
| **Auth** | Cognito (prod) / Demo tokens (dev) |
| **Infra** | Docker Compose (dev), ECS Fargate (prod), Nginx, CloudFormation |
| **Calidad** | TypeScript strict, SOLID, clean code, Error Boundary |

---

## Inicio rápido

### 1. Clonar

```bash
git clone https://github.com/JONAHBRUZZI/smartlogix.git
cd SmartLogix
```

### 2. Frontend (modo demo — sin backend)

```bash
cd Frontend
npm install
npm run dev -- --port 3000
```

Abrir `http://localhost:3000`. Login demo:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin@smartlogix.cl` | `Smartlogix123!` | Dueño |
| `operaciones@smartlogix.cl` | `Smartlogix123!` | Operador |
| `bodega@smartlogix.cl` | `Smartlogix123!` | Bodega |
| `transportista@smartlogix.cl` | `Smartlogix123!` | Transportista |

> En localhost el login usa tokens demo automáticamente. Los datos iniciales representan un negocio de bebidas y confites con 10 productos, 10 pedidos, 4 envíos y 8 alertas.

### 3. Backend (requiere Docker Desktop)

```bash
cd Backend
docker compose up -d
```

La primera ejecución descarga imágenes y compila los JARs (~10 min). Luego:

```bash
docker exec -i smartlogix-db psql -U postgres < seed.sql
```

Servicios expuestos:

| Servicio | Puerto |
|----------|--------|
| API Gateway (Nginx) | `8080` |
| orders-service | `8081` |
| inventory-service | `8082` |
| identity-service | `8083` |
| shipping-service | `8084` |
| notification-service | `8085` |
| LocalStack | `4567` |

### 4. Deploy a Vercel

```bash
cd Frontend
npm i -g vercel
vercel login
vercel
```

Variables de entorno en Vercel: `VITE_API_BASE_URL` = URL del API Gateway.

---

## Datos semilla — Negocio Bebidas y Confites

| SKU | Producto | Stock |
|-----|----------|-------|
| 100001 | Coca-Cola 2L | 48 |
| 100002 | Pepsi 2L | 72 |
| 100003 | Sprite 2L | 65 |
| 100004 | Agua Mineral 500ml | 120 |
| 100005 | Jugo Watt's 1L | 35 |
| 100006 | Cerveza Corona 355ml | 90 |
| 100007 | Chocolate Trencito | 3 ⚠️ |
| 100008 | Galletas McKay | 15 |
| 100009 | Papas Lays 200g | 8 |
| 100010 | Chicles Frugelé | 2 🔴 |

**Clientes:** Bar El Rincón, Kiosco Don Pepe, Distribuidora Sur.
**Canales:** Teléfono, WhatsApp, Correo.
**Transportista:** Luis Castro (reparto local).

---

## Estructura del repositorio

```
SmartLogix/
├── Frontend/
│   ├── src/
│   │   ├── app/            # Router, Auth, Control de acceso RBAC
│   │   ├── components/     # UI (shadcn), Layout (sidebar, mobile-nav, topbar)
│   │   ├── data/           # Mock data (modo demo)
│   │   ├── hooks/          # useApiQuery, useOperationalWorkspace, usePermissions
│   │   ├── lib/            # api-client (clase + DI), adapters, auth, export-csv
│   │   ├── pages/          # Dashboard, Orders, Inventory, Shipments, Login...
│   │   ├── styles/         # Tailwind + custom utilities (touch, safe-area)
│   │   └── types/          # api.ts, domain.ts
│   ├── vercel.json         # Deploy Vercel config
│   ├── vite.config.ts      # PWA + proxy dev
│   └── tailwind.config.ts  # Tema SmartLogix
├── Backend/
│   ├── orders-service/     # CRUD pedidos, SQS publisher, idempotencia
│   ├── inventory-service/  # Stock, validación, DataLoader seed
│   ├── shipping-service/   # Envíos, tracking, SNS notificaciones
│   ├── notification-service/ # Persistencia de eventos de notificación
│   ├── identity-service/   # Company, Role, User, UserSetting
│   ├── event-contracts/    # DTOs compartidos (validación Jakarta)
│   ├── nginx/              # API Gateway config
│   ├── docker-compose.yml  # 7 contenedores (Postgres, LocalStack, 5 servicios)
│   ├── seed.sql            # Datos de prueba negocio bebidas/confites
│   └── infrastructure/     # CloudFormation (VPC, RDS, ECS, pipeline)
├── ARQUITECTURA_FINAL_AWS_SMARTLOGIX.md
├── ARQUITECTURA_Y_CONFIGURACION.md
├── ESTRUCTURA_DATOS.md
└── MODELO_NEGOCIO_CHILE.md
```

---

## Modelo de negocio

SaaS B2B multi-tenant con pricing escalonado para el mercado chileno.

| Plan | Precio CLP | Pedidos/mes |
|------|-----------|-------------|
| **Starter** | $49.900 | 250 |
| **Professional** | $129.900 | 1,500 |
| **Enterprise** | $299.900 | 5,000 |

Detalles completos en [MODELO_NEGOCIO_CHILE.md](MODELO_NEGOCIO_CHILE.md).

---

## Principios aplicados

- **SOLID:** ApiClient con DI, CSV genérico Open/Closed, Error Boundaries
- **Clean Code:** `user-registry.ts` como fuente única de verdad, `normalizeFromMap` funcional
- **DRY:** 0 funciones duplicadas, helpers consolidados en `api-adapters.ts`
- **Mobile-first:** Touch targets 44px, `safe-area` iOS, PWA instalable, `overflow-x-auto scroll-x`
- **Seguridad:** Sin secretos hardcodeados, CSV injection sanitizado, tokens en variables

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor Vite + HMR |
| `npm run build` | Build producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `tsc --noEmit` |
| `Frontend/start-dev.ps1` | Script PowerShell con firewall + inicio automático |

---

## Licencia

MIT
