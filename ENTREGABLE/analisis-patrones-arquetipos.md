# Analisis de Patrones de Diseno y Arquetipos

**Proyecto:** SmartLogix - Plataforma de Gestion Logistica
**Arquitectura:** Microservicios con BFF (Backend For Frontend) + SPA React

---

## PARTE 1: PATRONES BACKEND

---

## 1. Patron BFF (Backend For Frontend)

### Que es
Un API Gateway que actua como punto unico de entrada entre el frontend y los microservicios. El frontend solo conoce una URL base y el BFF enruta cada peticion al servicio correspondiente.

### Implementacion real

- **Componente:** Nginx Alpine (contenedor Docker)
- **Archivo:** `Backend/nginx/nginx.conf`
- **Puerto:** 80

### Justificacion
- **Desacoplamiento:** El frontend llama a `/api/orders`, `/api/inventory`, etc. Si se cambia el puerto de un microservicio, solo se actualiza `nginx.conf`.
- **Seguridad centralizada:** Punto unico para aplicar CORS (via `shared/security.js`) y rate limiting.
- **Health check unico:** `GET /healthz` devuelve `{"status":"UP"}` sin consultar a los microservicios.

### Rutas configuradas (nginx.conf)

```
/api/orders        -> orders-service:8081
/api/customers     -> orders-service:8081
/api/inventory     -> inventory-service:8082
/api/sales         -> inventory-service:8082
/api/shipments     -> shipping-service:8084
/api/notifications -> notification-service:8085
```

---

## 2. Patron de Microservicios por Dominio

### Que es
Cada microservicio es dueno exclusivo de su dominio de negocio y su base de datos. No hay tablas compartidas. La comunicacion es via REST.

### Implementacion real

| Microservicio | Puerto | BD | Archivo principal | Responsabilidad |
|--------------|--------|-----|-------------------|-----------------|
| orders-service | 8081 | orders_db | `orders-service/src/index.js` | Pedidos (CRUD, confirmar, cancelar, asignar, eliminar) |
| inventory-service | 8082 | inventory_db | `inventory-service/src/index.js` | Stock (CRUD, ajustes atomicos, ventas) |
| shipping-service | 8084 | shipping_db | `shipping-service/src/index.js` | Envios (tracking, etapas, QR, notificaciones) |
| notification-service | 8085 | notification_db | `notification-service/src/index.js` | Trazabilidad (eventos, auditoria, idempotencia) |

### Justificacion
- **Aislamiento de fallos:** Si shipping-service falla, orders-service sigue funcionando.
- **Escalabilidad independiente:** inventory-service puede escalar mas si hay alta demanda de consultas.
- **Despliegue independiente:** Actualizar notification-service no requiere detener los demas.
- **Base de datos por servicio:** Cada tabla `CREATE TABLE IF NOT EXISTS` se ejecuta en el arranque (`ensureTables()`).

---

## 3. Patron Saga con Orquestacion

### Que es
Una operacion de negocio que abarca multiples servicios se coordina mediante un servicio orquestador que llama secuencialmente a los demas. SmartLogix usa **orquestacion**, no coreografia.

### Implementacion real

El flujo `PUT /api/orders/:id/confirm` en `orders-service/src/index.js:46-64`:

```
orders-service recibe PUT /confirm
  │
  ├──[1]──> inventory-service: POST /api/inventory/:sku/adjust?delta=-N
  │           (Descuenta stock. Si falla, acumula error pero continua)
  │
  ├──[2]──> shipping-service: POST /api/shipments
  │           (Crea envio con tracking. Si falla, acumula error)
  │           │
  │           └──> notification-service: POST /api/notifications
  │                   (shipping-service notifica el cambio de etapa)
  │
  └──[3]──> UPDATE orders SET status='EN_PREPARACION'
  │
  └── Respuesta: { ...order, warnings: [...] }
```

La cancelacion con restauracion de stock (`PUT /api/orders/:id/cancel`) en `orders-service/src/index.js:66-78`:

```
Si la orden esta EN_PREPARACION:
  └── inventory-service: POST /api/inventory/:sku/adjust?delta=+N
        (Restaura stock. Si falla, solo loguea el error)
```

### Justificacion
- **Manejo de errores parciales:** Los errores se acumulan en `warnings[]` sin detener el flujo.
- **Trazabilidad completa:** Cada paso queda registrado en notification-service.
- **Sin dependencia de colas:** REST sincrono es suficiente para el volumen de este sistema.

---

## 4. Patron Repository / Modulo Compartido

### Que es
El acceso a base de datos y la configuracion de Express se abstraen en modulos compartidos que todos los microservicios importan.

### Implementacion real

**`Backend/shared/`** contiene 6 modulos usados por los 4 servicios:

| Modulo | Archivo | Funcion |
|--------|---------|---------|
| app.js | `shared/app.js` | `createApp(dbName, port)` → Fabrica apps Express con CORS, JSON parsing, health check, graceful shutdown |
| db.js | `shared/db.js` | `createPool(databaseName)` → Pool PostgreSQL con variables de entorno |
| logger.js | `shared/logger.js` | `log.info()`, `log.error()`, `log.warn()` → Logging estructurado |
| security.js | `shared/security.js` | `applySecurity(app)` → Helmet + CORS + Rate limiting |
| validate.js | `shared/validate.js` | `validateOrderBody()`, `validateOrderStatus()` → Validacion de inputs |
| shutdown.js | `shared/shutdown.js` | `setupGracefulShutdown(server, pool)` → Cierre ordenado |

### Uso real en cada microservicio

```js
// orders-service/src/index.js
const { createApp, interServiceFetch } = require('../shared/app');
const { validateOrderBody, validateOrderStatus } = require('../shared/validate');
const log = require('../shared/logger');

const { app, pool, sendError, start } = createApp('orders_db', process.env.PORT || 8081);
```

### Justificacion
- **DRY:** 4 servicios comparten 6 modulos. Un cambio en `db.js` beneficia a todos.
- **Pool centralizado:** `createPool()` usa `DB_URL` de variables de entorno.
- **Seguridad uniforme:** Helmet, CORS y rate limiting identicos en todos los servicios.

---

## 5. Patron Observer / Publicador-Suscriptor

### Que es
Cuando un servicio genera un evento de negocio, notifica a un servicio de trazabilidad sin acoplarse a su implementacion.

### Implementacion real

**Emisor:** `shipping-service/src/index.js` notifica cambios de etapa via `interServiceFetch()`

**Receptor:** `notification-service/src/index.js` persiste eventos con idempotencia

Estructura de un evento (`POST /api/notifications`):

```json
{
  "orderId": 1,
  "stage": "EN_PREPARACION",
  "status": "info",
  "message": "Pedido confirmado y en preparacion",
  "sourceService": "shipping-service",
  "targetAudience": "OPERATOR"
}
```

### Justificacion
- **Auditabilidad:** Cada cambio de estado queda registrado con timestamp, origen y audiencia.
- **Idempotencia:** Restriccion UNIQUE en `(event_id, target_audience)`. Si se reenvia el mismo evento, se devuelve el existente sin error.
- **Consultable:** `GET /api/notifications/order/:id` entrega trazabilidad completa de un pedido.

---

## 6. Arquetipo de Microservicio Node.js/Express

### Que es
Plantilla reutilizable para crear nuevos microservicios con estructura, dependencias y configuracion identicas.

### Estructura real de cada microservicio

```
orders-service/                    # (identico en inventory/shipping/notification)
├── Dockerfile                     # FROM node:22-alpine, copia shared/ + src/
├── package.json                   # express, pg, helmet, cors, rate-limit
└── src/
    └── index.js                   # createApp() + ensureTables() + rutas + start()
```

### Dependencias comunes (package.json)

```json
{
  "dependencies": {
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "pg": "^8.13.1",
    "cors": "^2.8.5"
  }
}
```

### Dockerfile identico para los 4 servicios

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY orders-service/package*.json ./
RUN npm install --omit=dev
COPY orders-service/src/ ./src/
COPY shared/ ./shared/
EXPOSE 8081
USER node
CMD ["node", "src/index.js"]
```

### Como crear un nuevo microservicio

1. Copiar `orders-service/` como plantilla
2. Cambiar `package.json` → `"name"`
3. Ajustar `index.js`: nombre de BD, puerto, rutas REST
4. Agregar al `docker-compose.node.yml` como nuevo servicio
5. Agregar ruta en `nginx/nginx.conf`

---

## PARTE 2: PATRONES FRONTEND

---

## 7. Patron de Arquitectura Basada en Componentes

### Que es
La UI se construye componiendo piezas reutilizables e independientes. Cada componente encapsula su estado, estilos y comportamiento.

### Implementacion real

```
Frontend/src/
├── app/              # AuthProvider (React Context), router, control de acceso
├── components/
│   ├── common/       # MetricCard, PageHeader, InstallAppButton
│   ├── layout/       # AppShell, Sidebar, Topbar, MobileNav
│   └── ui/           # Button, Table, Sheet, Dialog, Card (shadcn/ui)
├── hooks/            # useApiQuery, useOperationalWorkspace, usePermissions...
├── lib/              # api-client, api-adapters, utils, export-csv
├── pages/            # 19 paginas (Dashboard, Orders, Inventory, POS...)
└── types/            # TypeScript: api.ts (DTOs), domain.ts (modelos)
```

### Jerarquia de componentes

```
AppShell (layout)
├── Sidebar (desktop, lg:flex)
├── Topbar (hamburguesa + notificaciones + perfil)
├── <Outlet /> (pagina activa: Dashboard, Orders, Inventory...)
└── MobileNav (mobile, lg:hidden)
```

### Justificacion
- **Separacion de responsabilidades:** Layout no conoce las paginas, paginas no conocen el layout.
- **Reutilizacion:** MetricCard se usa en Dashboard, Inventory, y POS.
- **shadcn/ui:** Componentes accesibles (Radix UI) con estilos personalizables via Tailwind.

---

## 8. Patron de Hooks Personalizados

### Que es
La logica de negocio y el estado se encapsulan en hooks reutilizables, separandolos de la UI.

### Implementacion real

| Hook | Archivo | Responsabilidad |
|------|---------|-----------------|
| `useApiQuery` | `hooks/use-api-query.ts` | Fetch generico al backend con estados `data`, `loading`, `error`, `refresh` |
| `useOperationalWorkspace` | `hooks/use-operational-workspace.ts` | Orquestador: enriquece ordenes/envios con estado UI, metodos `confirmOrder`, `cancelOrder`, `deleteOrder`, `adjustInventory` |
| `usePermissions` | `hooks/use-permissions.ts` | RBAC: expone `can("orders.create")`, `role` actual |
| `useAutoRefresh` | `hooks/use-auto-refresh.ts` | Polling cada N ms con `useEffect` + callback ref |
| `useOnlineStatus` | `hooks/use-online-status.ts` | Detecta `navigator.onLine` con event listeners |
| `usePwaInstall` | `hooks/use-pwa-install.ts` | Maneja `beforeinstallprompt` para instalacion PWA |
| `useAuth` | `app/auth.tsx` | React Context: expone `session`, `login`, `logout` |

### Ejemplo real: useOperationalWorkspace

```typescript
// orders-page.tsx
const { operationalOrders, validationQueue, confirmOrder, cancelOrder, deleteOrder }
  = useOperationalWorkspace({ orders });

// El hook enriquece Order → OperationalOrder con:
// { needsReview, canConfirm, operationalDecision, operationalNote }
```

### Justificacion
- **Separacion UI/logica:** Las paginas solo renderizan, los hooks manejan estado y API.
- **Reutilizacion:** useApiQuery se usa en 10+ paginas con diferentes tipos de respuesta.
- **Testeabilidad:** Los hooks pueden testearse independientemente de la UI.

---

## 9. Patron API Client con Manejo de Errores

### Que es
El cliente HTTP centraliza autenticacion, reintentos por token expirado, timeouts y transformacion de errores.

### Implementacion real

**Clase:** `lib/api-client.ts` → `ApiClient`

```
Frontend llama apiFetch("/api/orders")
  │
  ├── ApiClient.fetch()
  │     ├── Construye headers (Authorization: Bearer token)
  │     ├── Timeout de 30s via AbortController
  │     └── fetch(url, init)
  │
  ├── Si 401/403 → refreshToken()
  │     └── Reintenta la peticion original con nuevo token
  │
  └── ApiRequestError (clase custom)
        ├── error.isUnauthorized → "Sesion expirada"
        ├── error.isForbidden → "No tienes permisos"
        └── error.isTimeout → "Backend no respondio"
```

### Transformacion de errores (use-api-query.ts)

```typescript
const mapErrorToMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    if (error.isUnauthorized) return "Sesion expirada. Vuelve a iniciar sesion.";
    if (error.isForbidden) return "No tienes permisos para este recurso.";
    if (error.isTimeout) return "El backend no respondio a tiempo.";
    return error.message;
  }
  return "No se pudo conectar al backend.";
};
```

### Justificacion
- **Una sola fuente:** Toda llamada API pasa por `apiClient.fetch()`.
- **Refresh transparente:** El usuario no ve errores 401 si el token se renueva.
- **Mensajes en espanol:** Errores tecnicos se traducen a mensajes entendibles.

---

## 10. Patron API Adapter (Transformacion de DTOs)

### Que es
Los datos que vienen del backend (DTOs, snake_case) se transforman a modelos de dominio (camelCase) antes de llegar a la UI.

### Implementacion real

**Archivo:** `lib/api-adapters.ts`

| Funcion | Entrada (backend) | Salida (dominio) |
|---------|-------------------|------------------|
| `adaptOrder` | `ApiOrder` (id, customer_id, status, created_at...) | `Order` (id, customer, stage, createdAt, items, timeline) |
| `adaptInventory` | `ApiInventory` (id, sku, name, stock, price, cost) | `Product` (id, sku, name, stock, price, cost, status, category) |
| `adaptShipment` | `ApiShipment` (id, orderId, status, trackingNumber...) | `Shipment` (id, orderId, stage, tracking, carrier, eta) |
| `adaptNotifications` | `ApiNotificationRecord[]` | `TimelineEvent[]` (ordenados por fecha) |
| `adaptCustomer` | `ApiCustomer` (id, name, phone, address, email) | `Customer` (id, name, phone, address, email) |

### Ejemplo real

```typescript
// orders-page.tsx
const { data: orders } = useApiQuery<ApiOrder[], Order[]>({
  path: "/api/orders",
  transform: (r) => r.map((o) => adaptOrder(o, customerMap.get(String(o.customerId))))
});
```

### Justificacion
- **Tipado estricto:** TypeScript garantiza que la UI nunca recibe `snake_case`.
- **Normalizacion:** Estados del backend (`CREATED`, `EN_PREPARACION`) se mapean a etapas del dominio (`created`, `en_preparacion`).
- **Enriquecimiento:** `adaptOrder` cruza `customerId` con el mapa de clientes para resolver el nombre.

---

## 11. Patron RBAC (Control de Acceso Basado en Roles)

### Que es
Cada usuario tiene un rol (owner, ops, warehouse, shipper, vendor, support, customer) y cada funcionalidad requiere un permiso especifico.

### Implementacion real

**Archivos:**
- `app/access.ts` → `AppPermission`, `hasPermission()`, `getDefaultPathForRole()`
- `app/auth.tsx` → `AuthProvider` (React Context)
- `hooks/use-permissions.ts` → `usePermissions()` hook
- `components/layout/navigation.ts` → Items de navegacion con `permission` requerido

### Estructura de permisos

```typescript
type AppPermission =
  | "dashboard.view"
  | "orders.view" | "orders.create" | "orders.review"
  | "inventory.view" | "inventory.manage"
  | "shipments.view" | "shipments.update"
  | "sales.create"
  | "users.view";
```

### Uso real

```typescript
// En navigation.ts
{ title: "Pedidos", path: "/orders", icon: Package,
  permission: "orders.view" }           // Solo visible si tiene permiso

// En orders-page.tsx
const { can } = usePermissions();
const canCreate = can("orders.create"); // true/false segun rol
const canReview = can("orders.review");

// En el JSX
{canCreate && <button>Nuevo pedido</button>}
{canReview && order.stage === "created" && <button>Confirmar</button>}
```

### Roles y sus permisos

| Rol | Dashboard | Pedidos | Inventario | Envios | Ventas | Usuarios |
|-----|-----------|---------|------------|--------|--------|----------|
| owner | todo | todo | todo | todo | todo | todo |
| ops | ver | ver, crear, revisar | ver | ver | crear | - |
| warehouse | ver | ver | ver, gestionar | ver, actualizar | - | - |
| shipper | - | - | - | ver, actualizar | - | - |
| vendor | ver | - | ver | - | crear | - |

### Justificacion
- **Seguridad:** La UI oculta botones y rutas que el usuario no puede usar.
- **Navegacion condicional:** Sidebar y MobileNav solo muestran items permitidos.
- **Ruta por defecto:** `getDefaultPathForRole()` redirige a la pagina principal de cada rol.

---

## 12. Patron Layout Shell

### Que es
La estructura de la aplicacion (sidebar, header, contenido, navegacion inferior) se define una sola vez y las paginas se renderizan dentro via `<Outlet />`.

### Implementacion real

**Archivo:** `components/layout/app-shell.tsx`

```tsx
export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />          {/* Desktop: lg:flex */}

      {/* Mobile drawer (hamburguesa) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <NavLink>...</NavLink>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        {!isOnline && <OfflineBanner />}
        <main>
          <Outlet />                            {/* Pagina activa */}
        </main>
      </div>

      <MobileNav role={session.role} />         {/* Mobile: lg:hidden */}
    </div>
  );
}
```

### Responsive design

| Componente | Mobile (< 1024px) | Desktop (>= 1024px) |
|-----------|-------------------|---------------------|
| Sidebar | Oculto | `lg:flex`, fijo a la izquierda |
| Topbar | Muestra hamburguesa (`lg:hidden`) | Sin hamburguesa, solo titulo y perfil |
| MobileNav | Bottom nav con 4 items | `lg:hidden` (oculto) |
| Sheet drawer | Se abre con la hamburguesa | No disponible |
| Main padding | `pb-28` (espacio para bottom nav) | `lg:pb-6` |

### Justificacion
- **Una sola definicion:** Sidebar, Topbar y MobileNav se definen una vez en AppShell.
- **Outlet de React Router:** Cualquier pagina (Dashboard, Orders, Inventory...) se renderiza en el mismo slot.
- **Mobile-first:** La experiencia movil tiene bottom nav + drawer, escritorio tiene sidebar fijo.

---

## 13. Patron PWA (Progressive Web App)

### Que es
La aplicacion web se comporta como una app nativa: instalable, offline, con icono en la pantalla de inicio.

### Implementacion real

**Archivos:**
- `vite.config.ts` → `VitePWA` plugin con `manifest`, `workbox`, iconos
- `hooks/use-pwa-install.ts` → Captura `beforeinstallprompt` y expone `canInstall`, `promptInstall()`
- `hooks/use-online-status.ts` → Detecta `navigator.onLine` y muestra banner "Sin conexion"
- `components/common/install-app-button.tsx` → Boton "Instalar app"
- `public/` → Iconos PWA (192x192, 512x512)

### Configuracion real (vite.config.ts)

```typescript
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "SmartLogix",
    short_name: "SmartLogix",
    theme_color: "#1A3142",
    background_color: "#F5F7F9",
    display: "standalone",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [...]
  }
})
```

### Justificacion
- **Instalable:** Usuarios moviles pueden agregar la app a su pantalla de inicio.
- **Offline:** Service worker cachea assets estaticos. Banner avisa cuando no hay conexion.
- **Orientacion vertical:** Configurado para `portrait` (uso en mano).

---

## 14. Patron Compound Components (shadcn/ui)

### Que es
Componentes compuestos por sub-componentes que comparten estado implicitamente via React Context interno.

### Implementacion real

Todos los componentes en `components/ui/` usan este patron via Radix UI + `class-variance-authority`:

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: { default: "bg-primary", outline: "border", ghost: "hover:bg-accent" },
      size: { sm: "h-8 px-3", default: "h-10 px-4", lg: "h-12 px-6" }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);
```

### Ejemplos de uso real

```tsx
<Button variant="outline" size="sm">Volver</Button>
<Button className="bg-red-500 hover:bg-red-600 text-white">Eliminar</Button>

<Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Menu">
  <nav>...</nav>
</Sheet>

<Card>
  <CardContent>...</CardContent>
</Card>
```

### Justificacion
- **Variantes declarativas:** `variant="outline"` es mas legible que concatenar clases.
- **Accesibilidad integrada:** Radix UI maneja ARIA, focus trapping, keyboard navigation.
- **Personalizacion:** `className` permite extender estilos sin romper la base.

---

## 15. Patron Operational Workspace (Estado Enriquecido)

### Que es
Los datos crudos del backend se enriquecen con metadatos de UI (flags, decisiones operativas, colas de trabajo) para que las paginas solo consuman datos listos para renderizar.

### Implementacion real

**Hook:** `hooks/use-operational-workspace.ts`

```typescript
// Extension de Order → OperationalOrder
interface OperationalOrder extends Order {
  operationalDecision: OrderDecisionType | null;  // "approved" | "rejected"
  operationalNote: string | null;
  operationalUpdatedAt: string | null;
  needsReview: boolean;      // true si stage === "created"
  canConfirm: boolean;       // true si stage === "created"
}
```

### Colas de trabajo derivadas

```typescript
const validationQueue = operationalOrders.filter(o => o.needsReview);
const dispatchQueue = operationalOrders.filter(o => o.canConfirm);
const stockQueue = operationalInventory.filter(p => p.stock <= 5);
```

### Metodos de negocio

```typescript
confirmOrder(order)       → PUT /api/orders/:id/confirm
cancelOrder(order, reason) → PUT /api/orders/:id/cancel
deleteOrder(orderId)      → DELETE /api/orders/:id
adjustInventory(product, delta) → POST /api/inventory/:sku/adjust
updateShipmentStage(shipment, stage, proof) → PUT /api/shipments/:id/stage
```

### Justificacion
- **UI limpia:** `orders-page.tsx` no calcula `needsReview`, solo lo consume.
- **Centralizacion:** La logica de "que puede hacer el operador con este pedido" esta en un solo lugar.
- **Colas:** Dashboard puede mostrar `validationQueue.length` sin recalcularlo.

---

## Resumen de patrones

| # | Patron | Tipo | Implementacion |
|---|--------|------|---------------|
| 1 | BFF | Backend | `Backend/nginx/nginx.conf` |
| 2 | Microservicios por dominio | Backend | 4 servicios + 4 bases independientes |
| 3 | Saga (orquestacion) | Backend | `orders-service/src/index.js` → confirm/cancel |
| 4 | Repository / Modulo compartido | Backend | `Backend/shared/` (6 modulos) |
| 5 | Observer / Publicador-Suscriptor | Backend | shipping → notification via REST |
| 6 | Arquetipo Node.js/Express | Backend | Dockerfile + package.json + shared/ identicos |
| 7 | Arquitectura basada en componentes | Frontend | `src/components/` + `src/pages/` |
| 8 | Hooks personalizados | Frontend | `useApiQuery`, `useOperationalWorkspace`, `usePermissions` |
| 9 | API Client con manejo de errores | Frontend | `lib/api-client.ts` → ApiClient + ApiRequestError |
| 10 | API Adapter (DTO → Dominio) | Frontend | `lib/api-adapters.ts` |
| 11 | RBAC (Roles y Permisos) | Frontend | `app/access.ts` + `hooks/use-permissions.ts` |
| 12 | Layout Shell | Frontend | `components/layout/app-shell.tsx` |
| 13 | PWA (Progressive Web App) | Frontend | `vite.config.ts` + `use-pwa-install` + `use-online-status` |
| 14 | Compound Components | Frontend | `components/ui/` (shadcn/ui + Radix + cva) |
| 15 | Operational Workspace | Frontend | `hooks/use-operational-workspace.ts` |
