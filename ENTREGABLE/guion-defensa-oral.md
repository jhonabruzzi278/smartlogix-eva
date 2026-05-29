# SmartLogix - Guion de Defensa Oral (15 minutos)

---

## Diapositiva 1: Portada (1 min)
**SmartLogix: Plataforma de Gestion Logistica para PYMEs**

- Caso real: "Don Juan - Bebidas y Confites"
- Stack: Node.js + Express + PostgreSQL + React + Docker
- Repositorio: github.com/JONAHBRUZZI/smartlogix

---

## Diapositiva 2: Arquitectura General (2 min)
**Indicadores 2 y 6: Arquetipos y patrones arquitectonicos**

Mostrar diagrama:
```
Frontend (React/Vercel) -> Nginx BFF (:80) -> 4 microservicios -> 4 bases PostgreSQL
```

- **Database per Service**: Cada microservicio es dueno de su BD. Aislamiento total.
- **API Gateway / BFF**: Nginx como punto unico de entrada, CORS, routing.
- **Saga Pattern**: orders-service orquesta la transaccion distribuida:
  1. Crea pedido
  2. Ajusta inventario (compensacion si falla)
  3. Crea envio
  4. Notifica

**Justificacion:** Escalabilidad independiente. Si inventory tiene mas carga, solo se escala ese servicio. No hay acoplamiento entre esquemas.

---

## Diapositiva 3: Patrones de Diseno (2 min)
**Indicadores 1 y 5: 3+ patrones implementados**

1. **Repository** (`shared/db.js`): Encapsula acceso a datos. Pool de conexiones parametrizado. Si cambia el motor de BD, solo se modifica este archivo.

2. **Observer via REST**: orders-service notifica a inventory y shipping mediante HTTP. shipping notifica a notification. Sin brokers externos.

3. **Factory Method**: `createPool()`, `createSqsClient()` - cada servicio instancia sus dependencias via factories compartidas.

4. **Adapter** (Frontend): `api-adapters.ts` transforma snake_case de la API a camelCase del dominio. Aisla cambios de backend.

5. **Proxy** (Frontend): `api-client.ts` centraliza llamadas HTTP, errores, headers. Single source of truth para comunicacion.

**Justificacion:** Cada patron resuelve un problema especifico de acoplamiento, mantenibilidad y escalabilidad.

---

## Diapositiva 4: Flujo de Negocio (2 min)
**Indicador 8: Buenas practicas y resultados**

Demo del flujo completo:
```
POST /api/orders {"customerId":1, "sku":"100001", "quantity":3}
  -> 201 Created (orderId: 12)

PUT /api/orders/12/confirm
  -> inventory: stock 48 -> 45
  -> shipping: tracking TRACK-XXX creado
  -> notification: SHIPMENT_CREATED persistido

GET /api/notifications/order/12
  -> [{ stage: "SHIPMENT_CREATED", tracking: "TRACK-XXX" }]
```

- **Idempotencia**: UNIQUE constraint en notification_records evita duplicados
- **Health checks**: GET /health en cada servicio, Docker HEALTHCHECK
- **Rate limiting**: 200 req/min por IP
- **Graceful shutdown**: SIGTERM/SIGINT cierran conexiones limpiamente

---

## Diapositiva 5: Estrategia de Branching (2 min)
**Indicadores 3 y 7: GitFlow Adaptado**

- **Estrategia**: Trunk-Based Development (GitFlow simplificado)
- **Ramas**: `main` (produccion) + `feature/*` (corta duracion)
- **Sin develop**: equipo de 1 persona, CI/CD directo a Vercel/Docker Hub

Evidencia:
- 20+ commits atomicos con mensajes descriptivos
- Merge conflict resuelto: `docker-compose.node.yml` (befadc1)
- Feature branches: `sns-to-rest`, `nodejs-migration`, `remove-sqs`

**Justificacion:** Para equipo pequeno, Trunk-Based evita sobrecarga de GitFlow completo. Cada commit a main es deployable.

---

## Diapositiva 6: Buenas Practicas (2 min)
**Indicadores 4 y 8: Codigo limpio, pruebas, calidad**

- **Modularidad**: `shared/` con db, logger, validate, shutdown para los 4 servicios
- **Validacion**: `validate.js` centraliza reglas de negocio por entidad
- **Manejo de errores**: `try/catch` en cada handler, `sendError()` estandarizado
- **Logging**: Timestamps ISO 8601, niveles info/warn/error
- **Pruebas frontend**: Vitest + Testing Library en api-adapters, api-client, use-api-query
- **Docker**: Imagenes Alpine (~100 MB), pool BD limitado a 3, memory limits 128 MB

---

## Diapositiva 7: Demo en Vivo (2 min)

1. Mostrar `http://104.248.60.29/api/inventory` (10 productos)
2. Crear orden via curl
3. Confirmar orden
4. Mostrar notificaciones generadas
5. Mostrar frontend en Vercel: `https://smartlogix-five.vercel.app`

---

## Diapositiva 8: Conclusiones (1 min)

- 5 patrones de diseno implementados y justificados
- 3 patrones arquitectonicos (DB per Service, BFF, Saga)
- Estrategia de branching con evidencia de merges y conflictos
- Buenas practicas: codigo modular, health checks, idempotencia, rate limiting
- Stack ligero: Node.js + Express (500 MB RAM total vs 1.6 GB Java)
- Desplegado en VM + Vercel, listo para produccion
