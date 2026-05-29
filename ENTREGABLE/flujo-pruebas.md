# SmartLogix - Flujo completo de pruebas

## Requisitos previos

- Docker y Docker Compose instalados
- curl (o Postman) instalado
- Puerto 80 libre (o cambiar en docker-compose)

---

## Paso 1: Levantar el backend

```bash
cd C:\Microservicios\SmartLogix

# Bajar contenedores previos si existen
docker compose -f docker-compose.node.yml down

# Levantar todos los servicios (construye imagenes desde cero)
docker compose -f docker-compose.node.yml up -d --build

# Esperar 10 segundos a que PostgreSQL inicie
Start-Sleep -Seconds 10
```

---

## Paso 2: Verificar que todos los servicios responden

```bash
# Health check del BFF
curl http://localhost:80/healthz
# Esperado: {"status":"UP","service":"smartlogix-api-gateway"}

# Health check de cada microservicio
curl http://localhost:80/api/orders/test
# Esperado: orders-service UP

curl http://localhost:8084/api/shipments/test
# Esperado: shipping-service UP

curl http://localhost:8085/api/notifications/test
# Esperado: notification-service UP
```

---

## Paso 3: Sembrar datos de prueba (opcional)

```bash
# Si quieres datos de ejemplo (bebidas y snacks)
docker exec -i smartlogix-db psql -U postgres < Backend\seed.sql
```

---

## Paso 4: Probar el flujo de negocio completo (Happy Path)

### 4.1 Ver inventario inicial

```bash
curl -s http://localhost:80/api/inventory | python -m json.tool | Select-Object -First 30
```

### 4.2 Crear un pedido

```bash
curl -s -X POST http://localhost:80/api/orders `
  -H "Content-Type: application/json" `
  -d '{"customerId":1,"sku":"100001","quantity":2}' | python -m json.tool

# Esperado: { "orderId": X, "status": "CREATED", "message": "Orden creada correctamente", ... }
```

**Guarda el orderId que devuelve.** Lo necesitaras para los siguientes pasos.

### 4.3 Verificar que el pedido aparece en la lista

```bash
curl -s http://localhost:80/api/orders | python -m json.tool | Select-Object -First 20
# Debe mostrar el pedido con status: "CREATED"
```

### 4.4 Confirmar el pedido (flujo completo: descuenta stock + crea envio)

```bash
# Reemplaza {orderId} por el ID real
curl -s -X PUT http://localhost:80/api/orders/1/confirm | python -m json.tool

# Esperado: status cambia a "EN_PREPARACION". Si hay warnings, los muestra.
```

### 4.5 Verificar que el stock bajo

```bash
curl -s http://localhost:80/api/inventory/100001 | python -m json.tool
# El stock debio reducirse en 2 unidades
```

### 4.6 Verificar que se creo el envio

```bash
curl -s http://localhost:80/api/shipments | python -m json.tool | Select-Object -First 20
# Debe mostrar un envio con tracking "TRACK-XXXXXXXX"
```

### 4.7 Avanzar el envio: EN_PREPARACION → EN_REPARTO

```bash
curl -s -X PUT "http://localhost:80/api/shipments/1/stage?stage=EN_REPARTO" | python -m json.tool
```

### 4.8 Avanzar el envio: EN_REPARTO → ENTREGADO

```bash
curl -s -X PUT "http://localhost:80/api/shipments/1/stage?stage=ENTREGADO" `
  -H "Content-Type: application/json" `
  -d '{"customerCode":"C123","recipientRut":"12345678-9"}' | python -m json.tool
```

### 4.9 Ver trazabilidad completa del pedido

```bash
curl -s http://localhost:80/api/notifications/order/1 | python -m json.tool
# Debe mostrar todos los eventos: creacion, confirmacion, envio, reparto, entregado
```

---

## Paso 5: Probar cancelacion con restauracion de stock

### 5.1 Crear otro pedido

```bash
curl -s -X POST http://localhost:80/api/orders `
  -H "Content-Type: application/json" `
  -d '{"customerId":2,"sku":"100002","quantity":1}' | python -m json.tool
```

### 5.2 Confirmarlo (para que pase a EN_PREPARACION)

```bash
curl -s -X PUT http://localhost:80/api/orders/2/confirm | python -m json.tool
```

### 5.3 Ver stock actual de 100002

```bash
curl -s http://localhost:80/api/inventory/100002 | python -m json.tool
# Anota el stock actual
```

### 5.4 Cancelar el pedido

```bash
curl -s -X PUT http://localhost:80/api/orders/2/cancel `
  -H "Content-Type: application/json" `
  -d '{"reason":"Cliente ya no lo quiere"}' | python -m json.tool

# Esperado: status: "CANCELADO", cancel_reason: "Cliente ya no lo quiere"
```

### 5.5 Verificar que el stock se restauro

```bash
curl -s http://localhost:80/api/inventory/100002 | python -m json.tool
# El stock debio volver a su valor original
```

---

## Paso 6: Probar asignacion de transportista

```bash
# Crear un pedido nuevo
curl -s -X POST http://localhost:80/api/orders `
  -H "Content-Type: application/json" `
  -d '{"customerId":3,"sku":"100003","quantity":1}' | python -m json.tool

# Asignar transportista
curl -s -X PUT "http://localhost:80/api/orders/3/assign?transporter=shipper01" | python -m json.tool

# Esperado: assigned_to: "shipper01"

# Verificar en la lista
curl -s http://localhost:80/api/orders | python -m json.tool | Select-String "shipper01"
```

---

## Paso 7: Probar eliminacion de pedido

```bash
# Cancelar primero el pedido 3
curl -s -X PUT http://localhost:80/api/orders/3/cancel `
  -H "Content-Type: application/json" `
  -d '{"reason":"Pedido duplicado"}' | python -m json.tool

# Eliminar el pedido
curl -s -X DELETE http://localhost:80/api/orders/3 | python -m json.tool

# Esperado: { "message": "Orden eliminada correctamente", ... }

# Verificar que ya no aparece
curl -s http://localhost:80/api/orders | python -m json.tool | Select-String "3"
# No debe encontrar el pedido 3
```

---

## Paso 8: Probar ajuste manual de inventario

```bash
# Ver stock actual
curl -s http://localhost:80/api/inventory/100005 | python -m json.tool

# Aumentar stock en 10
curl -s -X POST "http://localhost:80/api/inventory/100005/adjust?delta=10" | python -m json.tool

# Reducir stock en 3 (genera una venta automatica)
curl -s -X POST "http://localhost:80/api/inventory/100005/adjust?delta=-3" | python -m json.tool

# Verificar que la venta se registro
curl -s http://localhost:80/api/sales | python -m json.tool | Select-Object -First 20
```

---

## Paso 9: Probar el frontend

```bash
cd Frontend
npm install
npm run dev
```

Abrir http://localhost:3000 y verificar:

1. **Login:** Inicia sesion con cualquier usuario de `Frontend/src/app/user-directory.ts`
   - Admin: `admin` / `admin123`
2. **Dashboard:** Debe cargar con metricas y alertas
3. **Pedidos:** Crear un pedido, confirmarlo, cancelarlo, eliminarlo
4. **Inventario:** Ver productos, ajustar stock
5. **Punto de Venta:** Registrar una venta
6. **Envios:** Ver tracking y cambiar etapas
7. **Mobile:** Reducir ventana a < 1024px. Debe aparecer bottom nav con 4 items y hamburguesa con sidebar

---

## Paso 10: Verificar logs (si algo falla)

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.node.yml logs --tail=50

# Ver logs de un servicio especifico
docker compose -f docker-compose.node.yml logs orders-service --tail=30
docker compose -f docker-compose.node.yml logs inventory-service --tail=30
docker compose -f docker-compose.node.yml logs shipping-service --tail=30
docker compose -f docker-compose.node.yml logs notification-service --tail=30
```

---

## Resultados esperados

### Happy Path (paso 4)
- [ ] BFF /healthz responde `{"status":"UP"}`
- [ ] Crear pedido devuelve `orderId` y `status: "CREATED"`
- [ ] Confirmar pedido cambia status a `EN_PREPARACION`
- [ ] Stock del SKU se reduce correctamente
- [ ] Se genera envio con tracking `TRACK-XXXXXXXX`
- [ ] Trazabilidad muestra todos los eventos en orden

### Cancelacion (paso 5)
- [ ] Pedido cancelado muestra `status: "CANCELADO"` con motivo
- [ ] Stock se restaura al valor original

### Asignacion (paso 6)
- [ ] Pedido muestra `assigned_to: "shipper01"`

### Eliminacion (paso 7)
- [ ] DELETE devuelve mensaje de confirmacion
- [ ] El pedido ya no aparece en GET /api/orders

### Inventario (paso 8)
- [ ] Ajustes positivos aumentan stock
- [ ] Ajustes negativos generan venta automatica

### Frontend (paso 9)
- [ ] Login funciona
- [ ] Navegacion entre secciones funciona
- [ ] CRUD de pedidos funciona desde la UI
- [ ] Mobile responsive: bottom nav + drawer sidebar visibles
