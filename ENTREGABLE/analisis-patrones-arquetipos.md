# Analisis de Patrones de Diseno y Arquetipos Arquitectonicos

**Proyecto:** SmartLogix
**Equipo:** Jonah Bruzzi
**Stack:** Node.js 22 + Express + PostgreSQL + Nginx
**Fecha:** Mayo 2026

---

## 1. Patrones de Diseno Implementados

### 1.1 Patron Repository (Backend - 4 microservicios)

**Ubicacion:** `Backend/shared/db.js` y cada `src/index.js`

**Problema que resuelve:** Separar la logica de acceso a datos de la logica de negocio. Sin un patron Repository, las consultas SQL estarian dispersas en los handlers HTTP, dificultando el mantenimiento y las pruebas.

**Implementacion:** El modulo `shared/db.js` exporta una funcion `createPool(dbName)` que configura un pool de conexiones PostgreSQL usando `pg`. Cada microservicio importa este modulo y ejecuta consultas parametrizadas. Las tablas se crean automaticamente con `CREATE TABLE IF NOT EXISTS` en la funcion `ensureTables()`.

```javascript
// shared/db.js
const { Pool } = require('pg');
function createPool(dbName) {
  const url = process.env.DB_URL || `postgresql://user:pass@host/${dbName}`;
  return new Pool({ connectionString: url, max: 3 });
}
```

**Justificacion:** Encapsula la configuracion de conexion. Si se cambia de PostgreSQL a otro motor, solo se modifica `db.js`. El pool de 3 conexiones mantiene bajo consumo de recursos.

---

### 1.2 Patron Observer / Event-Driven (via REST)

**Ubicacion:** orders-service, shipping-service, notification-service

**Problema que resuelve:** Cuando se confirma un pedido, se debe notificar a inventory (ajustar stock), shipping (crear envio) y notification (registrar evento) sin acoplamiento fuerte entre servicios.

**Implementacion:** El patron Observer se implementa via llamadas REST encadenadas. orders-service actua como sujeto que notifica a los observadores (inventory, shipping) mediante HTTP. shipping-service a su vez notifica a notification-service.

```
orders-service --REST--> inventory-service (ajusta stock)
orders-service --REST--> shipping-service (crea envio)
shipping-service --REST--> notification-service (registra evento)
```

```javascript
// orders-service: confirmar orden -> notifica observers via REST
await fetch(`${INVENTORY_URL}/api/inventory/${sku}/adjust?delta=-${qty}`);
await fetch(`${SHIPPING_URL}/api/shipments`, { body: shipmentData });
```

**Justificacion:** Desacopla servicios sin depender de brokers de mensajeria externos (SQS, Kafka). Cada servicio falla independientemente. Facil de extender: agregar un nuevo observer es agregar una llamada REST.

---

### 1.3 Patron Factory Method (Creacion de servicios)

**Ubicacion:** `Backend/shared/` y cada `src/index.js`

**Problema que resuelve:** Cada microservicio necesita una instancia unica de pool de BD, logger, y configuracion de Express sin repetir codigo de inicializacion.

**Implementacion:** Los modulos compartidos (`shared/db.js`, `shared/logger.js`, `shared/validate.js`, `shared/shutdown.js`) exportan funciones factory que cada servicio invoca para crear sus dependencias.

```javascript
const pool = createPool('orders_db');        // Factory: crea pool para orders
const log = require('../shared/logger');      // Singleton: logger compartido
```

**Justificacion:** Evita duplicacion de codigo entre los 4 microservicios. Si se cambia la configuracion de BD, se modifica un solo archivo. Facilita pruebas unitarias al permitir inyeccion de dependencias mock.

---

### 1.4 Patron Adapter (Frontend)

**Ubicacion:** `Frontend/src/lib/api-adapters.ts`

**Problema que resuelve:** Los datos que vienen de la API REST (snake_case, tipos planos) no coinciden con el modelo de dominio del frontend (camelCase, tipos enriquecidos).

**Implementacion:** El modulo `api-adapters.ts` transforma las respuestas de la API al modelo del frontend:

```typescript
export function adaptOrder(raw: ApiOrder): Order {
  return {
    id: raw.id,
    customerId: raw.customer_id,
    sku: raw.sku,
    quantity: raw.quantity,
    status: raw.status,
  };
}
```

**Justificacion:** Aisla los cambios de API del resto de la aplicacion. Si el backend cambia el formato de respuesta, solo se modifica el adapter.

---

### 1.5 Patron Proxy (Frontend - API Client)

**Ubicacion:** `Frontend/src/lib/api-client.ts`

**Problema que resuelve:** Centralizar todas las llamadas HTTP, manejo de errores, autenticacion y headers en un solo lugar.

**Implementacion:** `api-client.ts` proporciona funciones `get`, `post`, `put` que envuelven `fetch` con manejo de errores estandarizado, headers comunes, y transformacion de respuestas.

```typescript
export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new ApiRequestError(res.status, await res.text());
  return res.json();
}
```

**Justificacion:** Si se cambia de fetch a axios, solo se modifica este archivo. Manejo de errores consistente en toda la app. Facil de mockear en pruebas.

---

## 2. Arquetipos y Patrones Arquitectonicos

### 2.1 Microservicios con Database per Service

**Problema que resuelve:** Un sistema monolitico con una sola base de datos crea acoplamiento en el esquema, dificulta el escalado independiente y convierte cualquier cambio de schema en un riesgo global.

**Implementacion:** 4 bases de datos independientes, una por cada bounded context:

| Servicio | Base de datos | Responsabilidad |
|----------|--------------|----------------|
| orders-service | orders_db | Pedidos |
| inventory-service | inventory_db | Stock y ventas |
| shipping-service | shipping_db | Envios y tracking |
| notification-service | notification_db | Trazabilidad |

Cada servicio crea sus propias tablas al iniciar (`CREATE TABLE IF NOT EXISTS`).

**Justificacion:** Aislamiento total entre servicios. Cada equipo puede modificar su esquema sin afectar a otros. Permite escalar y optimizar cada BD segun necesidades del servicio.

---

### 2.2 API Gateway / Backend For Frontend (BFF)

**Problema que resuelve:** Exponer 4 microservicios en diferentes puertos al frontend crearia complejidad de CORS, multiples dominios, y logica de routing en el cliente.

**Implementacion:** Nginx actua como API Gateway en puerto 80, enrutando por path:

```nginx
location /api/orders      -> orders-service:8081
location /api/inventory   -> inventory-service:8082
location /api/sales       -> inventory-service:8082
location /api/shipments   -> shipping-service:8084
location /api/notifications -> notification-service:8085
location /api/customers   -> orders-service:8081
```

**Justificacion:** Punto unico de entrada. Oculta topologia interna. Permite agregar rate limiting, autenticacion y CORS en un solo lugar. Facilita el versionado de API.

---

### 2.3 Saga Pattern (Orquestacion de Pedidos)

**Problema que resuelve:** El proceso "crear pedido -> validar stock -> confirmar -> generar despacho -> notificar" es una transaccion distribuida entre 4 servicios con bases de datos independientes. No se puede usar ACID tradicional.

**Implementacion:** Saga orquestada donde orders-service es el coordinador:

```
1. orders-service: crea pedido en orders_db (status=CREATED)
2. orders-service: PUT /confirm dispara la saga
   a. REST -> inventory-service: ajusta stock (-quantity)
   b. REST -> shipping-service: crea envio + tracking
      c. REST -> notification-service: persiste evento SHIPMENT_CREATED
3. orders-service: actualiza status a EN_PREPARACION
```

Si algun paso falla, el warning se registra y el flujo continua (eventual consistency). Para cancelaciones, se ejecuta la compensacion inversa (restaurar stock).

**Justificacion:** Garantiza la consistencia eventual del negocio sin bloquear servicios. Cada paso es independiente y trazable.

---

## 3. Estrategia de Branching (GitFlow Adaptado)

### Ramas principales

| Rama | Proposito |
|------|----------|
| `main` | Codigo en produccion. Cada commit es deployable. |
| `develop` | Integracion de features. (Simplificado: usamos main directamente por ser equipo pequeno) |

### Flujo de trabajo

```
main
  ├── feature/sns-to-rest     # Reemplazo SNS por REST
  ├── feature/nodejs-migration # Migracion Java a Node.js
  ├── feature/swagger-api      # Documentacion OpenAPI
  ├── fix/elasticmq-healthcheck # Fix healthcheck compose
  ├── fix/db-url-ports         # Correccion DB_URL y puertos
  └── refactor/remove-sqs      # Eliminacion de SQS/elasticmq
```

### Evidencia de merges y resolucion de conflictos

- Commit `befadc1`: Merge conflict en docker-compose.node.yml resuelto
- Commit `ce35a41`: Merge con vite.config.ts generado
- Todos los merges documentados en `git log --merges`

---

## 4. Buenas Practicas y Pruebas

### 4.1 Codigo limpio y modular

- **Separacion de concerns:** Cada servicio tiene `src/index.js` (rutas), `src/db.js` (datos), `src/sqs.js` (mensajeria)
- **Modulos compartidos:** `Backend/shared/` contiene codigo reutilizado por los 4 servicios
- **Validacion centralizada:** `shared/validate.js` con funciones de validacion por entidad
- **Manejo de errores:** `try/catch` en cada handler, `sendError()` estandarizado
- **Logging estructurado:** Timestamps ISO 8601, nivel de log configurable

### 4.2 Health checks

Todos los servicios exponen `GET /health`:
```json
{"status": "UP", "db": "connected"}
```

Docker HEALTHCHECK en cada Dockerfile usando `wget` contra el endpoint.

### 4.3 Idempotencia

- notification-service: constraint `UNIQUE(event_id, target_audience)` evita duplicados
- inventory-service: tabla `processed_events` con PRIMARY KEY (event_type, event_key)
- Manejo de `ON CONFLICT DO NOTHING` en INSERTs

### 4.4 Contenedores optimizados

- Imagenes Alpine (~100 MB vs ~428 MB Java)
- Pool de conexiones limitado a 3 por servicio
- Rate limiting via `express-rate-limit` (200 req/min)
- Graceful shutdown con `SIGTERM`/`SIGINT`

### 4.5 Pruebas (Frontend)

El frontend incluye tests con Vitest:
```bash
cd Frontend && npm test
```

Archivos de prueba:
- `src/hooks/__tests__/use-api-query.test.tsx`
- `src/lib/__tests__/api-adapters.test.ts`
- `src/lib/__tests__/api-client.test.ts`
