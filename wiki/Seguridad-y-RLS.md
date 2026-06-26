# Seguridad y RLS

SmartLogix implementa un modelo de seguridad de tres capas para garantizar que cada usuario acceda solo a los datos que le corresponden.

---

## Modelo de tres capas

```
Capa 1 — Servidor (primaria)
  └─ El backend extrae el rol del JWT y elimina campos sensibles
     antes de enviar el response

Capa 2 — Endpoints especializados
  └─ El endpoint de tracking público devuelve solo campos seguros,
     sin importar quién lo llame

Capa 3 — Frontend (secundaria / defensa en profundidad)
  └─ Las páginas no renderizan secciones sensibles según el rol,
     aunque el servidor ya protege el dato en origen
```

---

## Capa 1 — RLS en el servidor

### Extracción del rol desde JWT

El `orders-service` decodifica el token JWT en cada request sin verificar la firma (confía en que el API Gateway filtra requests inválidos):

```javascript
function extractRoleFromRequest(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  const groups = payload['cognito:groups'];
  return Array.isArray(groups) && groups.length ? groups[0].toLowerCase() : null;
}
```

### Roles restringidos

```javascript
const RESTRICTED_ROLES = new Set(['shipper', 'customer', 'vendor']);
```

### Aplicación en endpoints

```javascript
// GET /api/orders — lista de órdenes
const role = extractRoleFromRequest(req);
const rows = (await pool.query(query, params)).rows;
if (RESTRICTED_ROLES.has(role)) stripClientCode(rows);
res.json(rows);

// GET /api/orders/:id — detalle de orden
const role = extractRoleFromRequest(req);
const row = r.rows[0];
if (RESTRICTED_ROLES.has(role)) delete row.client_code;
res.json(row);
```

---

## Capa 2 — Endpoint de tracking público

El endpoint `GET /api/orders/track/:clientCode` está disponible **sin autenticación** y devuelve solo los campos seguros — no hay forma de extraer email, teléfono ni dirección del cliente desde este endpoint:

**Campos devueltos:**
- `id`, `sku`, `quantity`, `status`, `created_at`
- `client_code` (el cliente lo conoce — lo usó para la búsqueda)
- `cancel_reason`
- `customer_name` (nombre de pila, sin datos de contacto)

**Campos excluidos:**
- `customer_email`
- `customer_phone`
- `customer_address`
- `rut`

---

## Capa 3 — Renderizado condicional en el frontend

Aunque el servidor ya protege el dato, el frontend añade una capa visual:

```typescript
// shipment-detail-page.tsx
const { role } = usePermissions();

{/* Solo roles con acceso interno ven el código */}
{role !== "shipper" && orderClientCode && (
  <ClientCodeCard code={orderClientCode} />
)}
```

También se aplica en la lista de envíos:

```typescript
// shipments-page.tsx — solo muestra envíos del transportista asignado
const shipperOrderIds = useMemo(() => {
  if (role !== "shipper" || !session?.username) return null;
  return new Set(
    orders.filter(o => o.assignedTo === session.username).map(o => o.id)
  );
}, [role, session?.username, orders]);
```

---

## Validación de entrega

La validación más estricta del sistema ocurre al confirmar la entrega. El `shipping-service` verifica dos factores independientes:

| Factor | Qué valida | Contra qué |
|--------|-----------|------------|
| `customerCode` | Que el cliente entregó su código | `orders.client_code` |
| `recipientRut` | Que quien recibió es el cliente registrado | `customers.rut` |

Si cualquiera falla:
```json
{ "error": "Código de cliente o RUT incorrecto" }
```

La etapa del envío **no cambia**.

---

## Protección de datos en el tracking público

El cliente final solo conoce su `SL-XXXXXX`. Con ese código puede ver el estado de su pedido, pero **no puede ver** datos de otros pedidos ni acceder a información de operaciones internas.

El endpoint de tracking valida que el código exista y devuelve solo los campos enumerados explícitamente en la query SQL — no un `SELECT *`.

---

## Flujo de autenticación (modo demo)

En el entorno de demostración, el login asigna roles por nombre de usuario. En un entorno de producción con AWS Cognito:

1. El usuario se autentica con Cognito
2. Cognito devuelve un JWT con los grupos del usuario en `cognito:groups`
3. El frontend incluye el JWT en el header `Authorization: Bearer <token>`
4. Cada microservicio decodifica el payload para conocer el rol
5. El API Gateway puede verificar la firma del token antes de hacer forward

---

## Checklist de seguridad implementado

- [x] No hay secretos hardcodeados en el código fuente
- [x] Inputs validados en todos los endpoints (`validateOrderBody`, `validateOrderStatus`)
- [x] Rate limiting habilitado en todos los servicios (via shared/security.js)
- [x] Helmet activado (headers de seguridad HTTP)
- [x] CORS configurado explícitamente
- [x] Los mensajes de error no exponen detalles de la base de datos al cliente
- [x] El campo `client_code` se elimina server-side para roles restringidos
- [x] El endpoint de tracking no expone datos de contacto del cliente
- [x] La confirmación de entrega requiere dos factores independientes
- [x] El transportista nunca recibe `client_code` por ningún endpoint
