# Analisis de Patrones de Diseno y Arquetipos

**Proyecto:** SmartLogix - Plataforma de Gestion Logistica
**Arquitectura:** Microservicios con BFF (Backend For Frontend)

---

## 1. Patron BFF (Backend For Frontend)

### Que es
El patron BFF consiste en un API Gateway que actua como intermediario entre el frontend y los microservicios. En lugar de que el frontend conozca las URL de cada microservicio, todas las peticiones pasan por un unico punto de entrada.

### Implementacion en SmartLogix
- **Componente:** Nginx actuando como reverse proxy
- **Archivo:** `Backend/nginx/nginx.conf`
- **Puerto:** 80

### Justificacion
- **Desacoplamiento:** El frontend solo conoce una URL base (`/api/*`). Si cambia la ubicacion o el puerto de un microservicio, solo se actualiza el BFF.
- **Seguridad:** Punto unico para aplicar CORS, rate limiting y headers de seguridad.
- **Simplicidad del frontend:** El cliente React solo llama a `/api/orders`, `/api/inventory`, etc., sin preocuparse de puertos.
- **Salud centralizada:** Endpoint `/healthz` permite monitorear todo el sistema desde un solo punto.

### Rutas configuradas
```
/api/orders        -> orders-service:8081
/api/customers     -> orders-service:8081
/api/inventory     -> inventory-service:8082
/api/sales         -> inventory-service:8082
/api/shipments     -> shipping-service:8084
/api/notifications -> notification-service:8085
```

---

## 2. Patron de Microservicios (Descomposicion por Dominio)

### Que es
Cada microservicio es dueño de su propio dominio de negocio y base de datos. No comparten tablas ni estado entre si. La comunicacion es via API REST.

### Implementacion en SmartLogix

| Microservicio | Dominio | Base de datos propia |
|--------------|---------|---------------------|
| orders-service | Gestion de pedidos | orders_db |
| inventory-service | Control de stock y ventas | inventory_db |
| shipping-service | Envios y tracking | shipping_db |
| notification-service | Trazabilidad y auditoria | notification_db |

### Justificacion
- **Aislamiento:** Un fallo en shipping-service no impide crear pedidos.
- **Escalabilidad independiente:** inventory-service puede escalarse mas si hay alta demanda de consultas de stock.
- **Despliegue independiente:** Se puede actualizar notification-service sin detener los demas.
- **Base de datos por servicio:** Cada servicio tiene su propia BD, evitando acoplamiento a nivel de datos.

---

## 3. Patron Saga (Coreografia)

### Que es
En una arquitectura de microservicios, una operacion de negocio que abarca varios servicios se coordina mediante una secuencia de llamadas. SmartLogix usa el enfoque de **orquestacion** (un servicio coordina a los demas).

### Implementacion en SmartLogix

El flujo de confirmacion de un pedido (`PUT /api/orders/:id/confirm`) es una saga orquestada por orders-service:

```
orders-service recibe PUT /confirm
  │
  ├──[1]──> inventory-service: POST /adjust?delta=-N
  │           (Descuenta stock del producto)
  │
  ├──[2]──> shipping-service: POST /shipments
  │           (Crea envio con tracking)
  │           │
  │           └──> notification-service: POST /notifications
  │                   (Registra evento de creacion)
  │
  └──[3]──> Actualiza estado a EN_PREPARACION
```

Si falla el ajuste de inventario, el proceso se detiene con errores acumulados y se reportan al cliente.

### Justificacion
- **Trazabilidad:** Cada paso queda registrado en notification-service.
- **Manejo de errores parciales:** Si un paso falla, los errores se acumulan y se informan sin detener los pasos que si funcionan.
- **Simplicidad:** No requiere un bus de mensajes ni colas SQS/SNS. REST sincrono es suficiente para el volumen de este sistema.

---

## 4. Patron Repository (Acceso a Datos)

### Que es
Abstrae el acceso a la base de datos detras de funciones reutilizables, evitando que la logica de negocio contenga consultas SQL directas.

### Implementacion en SmartLogix
- **Modulo compartido:** `Backend/shared/db.js` proporciona una fabrica de pools PostgreSQL.
- **Abstraccion:** `createApp(dbName, port)` en `shared/app.js` encapsula la creacion del pool y la configuracion de Express.
- **Transacciones:** Cada microservicio ejecuta queries SQL directamente con `pool.query()`, pero todas usan el mismo pool configurado por el modulo compartido.

### Justificacion
- **DRY:** Los 4 microservicios comparten el mismo codigo de conexion y configuracion.
- **Pool de conexiones:** Evita crear/destruir conexiones por cada peticion.
- **Configuracion centralizada:** Variables de entorno iguales para todos los servicios.

---

## 5. Patron Observer / Notificacion

### Que es
Cuando ocurre un evento en un servicio, se notifica a otro servicio interesado sin que el emisor necesite conocer los detalles del receptor.

### Implementacion en SmartLogix
- **Emisor:** shipping-service notifica cambios de etapa
- **Receptor:** notification-service persiste el evento para trazabilidad

### Justificacion
- **Auditabilidad:** Cada cambio de estado queda registrado con timestamp, servicio origen y audiencia destino.
- **Idempotencia:** El notification-service evita duplicados mediante restriccion UNIQUE en `(event_id, target_audience)`.

---

## 6. Arquetipo de Microservicio Node.js/Express

SmartLogix define un **arquetipo reutilizable** para todos sus microservicios:

### Estructura base
```
servicio/
├── Dockerfile              # Node.js 22 Alpine, copia shared/ + src/
├── package.json            # express, pg, helmet, cors, rate-limit
└── src/
    └── index.js            # createApp(), rutas REST, ensureTables(), start()
```

### Arquetipo compartido (shared/)
```
shared/
├── app.js       # Fabrica de apps Express
├── db.js        # Pool PostgreSQL
├── logger.js    # Logging estructurado
├── security.js  # Helmet + CORS + Rate limiting
├── validate.js  # Validacion de entradas
└── shutdown.js  # Apagado graceful
```

### Como crear un nuevo microservicio usando el arquetipo

1. Copiar cualquier microservicio existente como plantilla
2. Cambiar `package.json` > `name`
3. Ajustar `index.js`: nombre de BD, puerto, rutas
4. Agregar al `docker-compose.yml` y `nginx.conf`

---

## Resumen de patrones

| Patron | Proposito | Donde se usa |
|--------|----------|-------------|
| BFF | API Gateway unico | Nginx reverse proxy |
| Microservicios | Dominios independientes | 4 servicios con BD propia |
| Saga (orquestacion) | Flujo de negocio multi-servicio | orders-service al confirmar |
| Repository | Acceso a datos abstraido | shared/db.js + shared/app.js |
| Observer | Notificacion de eventos | shipping -> notification |
| Arquetipo | Plantilla reutilizable | shared/ + Dockerfile + package.json |
