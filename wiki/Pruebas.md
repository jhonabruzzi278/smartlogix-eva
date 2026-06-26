# Pruebas

SmartLogix incluye pruebas unitarias en cada microservicio y en el frontend.

---

## Backend — microservicios

Cada servicio usa **Jest** como framework de pruebas y **Supertest** para pruebas de endpoints HTTP.

### Ejecutar pruebas

```bash
# Un servicio específico
cd Backend/orders-service && npm test
cd Backend/inventory-service && npm test
cd Backend/shipping-service && npm test
cd Backend/notification-service && npm test

# Con reporte de cobertura (genera coverage/index.html)
npm test -- --coverage
```

### Estructura de las pruebas

```
orders-service/
└── src/
    └── __tests__/
        ├── orders.test.js      CRUD de órdenes
        ├── customers.test.js   CRUD de clientes
        ├── tracking.test.js    Endpoint público de tracking
        └── rls.test.js         Row-Level Security por rol
```

### Qué se prueba

| Área | Casos cubiertos |
|------|----------------|
| Órdenes | Crear, listar, confirmar, cancelar, asignar, eliminar |
| Clientes | CRUD completo, validación de RUT |
| Tracking | Código válido, código inexistente, formato incorrecto |
| RLS | `client_code` ausente para shipper/customer/vendor, presente para owner/ops |
| Inventario | CRUD, ajuste de stock, stock negativo |
| Envíos | Crear, cambiar etapa, validación ENTREGADO |
| Notificaciones | Persistir evento, consultar por orden, consultar por audiencia |

### Ejemplo de prueba con Supertest

```javascript
describe('RLS — client_code', () => {
  it('owner recibe client_code en el response', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('client_code');
  });

  it('shipper NO recibe client_code en el response', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${shipperToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty('client_code');
  });
});
```

---

## Frontend

Usa **Vitest** como runner y **React Testing Library** para pruebas de componentes.

### Ejecutar pruebas

```bash
cd Frontend
npm test                 # Modo watch
npm run test:coverage    # Reporte de cobertura en coverage/index.html
```

### Qué se prueba

| Área | Casos cubiertos |
|------|----------------|
| Hooks | useApiQuery, useCustomerScope, usePermissions |
| Adaptadores | api-adapters (snake_case → camelCase) |
| Utilidades | cn(), formatDate(), formatCurrency() |
| RBAC | isPathAllowedForRole, hasPermission, getDefaultPathForRole |
| Componentes | StatusBadge, MetricCard, EmptyState |

---

## Colección Postman

En la carpeta `ENTREGABLE/` se incluye la colección Postman con todos los endpoints:

```
ENTREGABLE/
├── SmartLogix.postman_collection.json
└── SmartLogix_Newman_Report.html
```

### Importar en Postman

1. Abrir Postman
2. `Import` → seleccionar `SmartLogix.postman_collection.json`
3. Configurar la variable de entorno `baseUrl = http://localhost:8080`
4. Ejecutar los requests en orden

### Ejecutar con Newman (CLI)

```bash
npm install -g newman
newman run ENTREGABLE/SmartLogix.postman_collection.json \
  --env-var "baseUrl=http://localhost:8080" \
  --reporters cli,html \
  --reporter-html-export ENTREGABLE/SmartLogix_Newman_Report.html
```

---

## Cobertura mínima

| Servicio | Umbral configurado |
|----------|-------------------|
| orders-service | 60% en todas las métricas |
| inventory-service | 60% en todas las métricas |
| shipping-service | 60% en todas las métricas |
| notification-service | 60% en todas las métricas |
| Frontend | 60% en todas las métricas |

La configuración está en el `jest.config.js` de cada servicio y en `vitest.config.ts` del frontend.

---

## Verificación manual rápida

Para verificar que el sistema completo funciona después de levantar Docker:

```bash
# 1. Health check
curl http://localhost:8080/healthz

# 2. Crear cliente y orden
curl -X POST http://localhost:8080/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.cl","rut":"11.111.111-1"}'

curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"sku":"TEST-SKU","quantity":1}'

# 3. Confirmar la orden
curl -X PUT http://localhost:8080/api/orders/1/confirm

# 4. Verificar tracking (usa el customerCode del paso 2)
curl http://localhost:8080/api/orders/track/SL-XXXXXX
```
