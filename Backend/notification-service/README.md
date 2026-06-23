# notification-service

Microservicio de trazabilidad y auditoria. Node.js 22 + Express 4 + PostgreSQL.

## Responsabilidad

Persiste eventos de notificacion generados por los otros microservicios, proporcionando trazabilidad completa del ciclo de vida de cada pedido. Actua como registro de auditoria.

## Puerto

`8085` | Base de datos: `notification_db`

## Dependencias

- express, pg, helmet, cors, express-rate-limit
- shared/ (app, db, logger, validate, security, shutdown)

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/notifications/test | Health check |
| POST | /api/notifications | Persistir evento de notificacion |
| GET | /api/notifications/order/:id | Trazabilidad completa de un pedido |
| GET | /api/notifications/audience/:aud | Filtrar por audiencia (CLIENT, OPERATOR, BOTH) |

## Estructura de un evento

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

## Idempotencia

Los eventos tienen una restriccion de unicidad en `(event_id, target_audience)`. Si se intenta insertar un evento duplicado, se devuelve el evento existente sin error (UPSERT).

## Audiencias

- `CLIENT` - Visible para el cliente final
- `OPERATOR` - Visible para operadores/administradores
- `BOTH` - Visible para ambos

## Ejecucion

### Con Docker (recomendado)

```bash
# Desde la raiz del proyecto
docker compose -f docker-compose.node.yml up -d --build
```

### Sin Docker (desarrollo)

```bash
cd Backend/notification-service
npm install
DB_URL=postgresql://postgres:postgres@localhost:5432/notification_db node src/index.js
```

## Variables de entorno

| Variable | Default | Descripcion |
|----------|---------|-------------|
| PORT | 8085 | Puerto HTTP |
| DB_URL | postgresql://postgres:postgres@postgres-db:5432/notification_db | Conexion BD |
| ALLOWED_ORIGINS | * | CORS origins |

## Pruebas Unitarias

### Ejecutar pruebas

```bash
npm test
```

### Ejecutar con cobertura (genera reporte HTML)

```bash
npm test -- --coverage
# Reporte generado en: coverage/index.html
```

### Ver reporte de cobertura

Abrir `coverage/index.html` en el navegador.

### Cobertura actual

| Métrica    | Porcentaje |
|------------|-----------|
| Statements | ver coverage/index.html |
| Branches   | ver coverage/index.html |
| Functions  | ver coverage/index.html |
| Lines      | ver coverage/index.html |

Umbral mínimo configurado: **60%** en todas las métricas.
