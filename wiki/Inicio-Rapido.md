# Inicio rápido

Levantar SmartLogix completo en 3 pasos.

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Node.js 22 (solo para el frontend en modo desarrollo)
- Git

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/jhonabruzzi278/smartlogix-eva.git
cd smartlogix-eva
```

---

## Paso 2 — Levantar el backend

```bash
docker compose up -d --build
```

Este comando construye y levanta 6 contenedores:

| Contenedor | Puerto | Descripción |
|-----------|--------|-------------|
| smartlogix-db | 5432 | PostgreSQL 15 (4 bases de datos) |
| smartlogix-orders | 8081 | orders-service |
| smartlogix-inventory | 8082 | inventory-service |
| smartlogix-shipping | 8084 | shipping-service |
| smartlogix-notification | 8085 | notification-service |
| smartlogix-api-gateway | **8080** | Nginx BFF (entrada única) |

Verificar que todo está corriendo:

```bash
docker compose ps
curl http://localhost:8080/healthz
# → OK
```

---

## Paso 3 — Levantar el frontend

```bash
cd Frontend
npm install
npm run dev
```

Abre `http://localhost:3000` en el navegador.

---

## Acceder al sistema

### Usuarios de prueba

| Usuario | Contraseña | Rol | Página inicial |
|---------|-----------|-----|---------------|
| `admin` | `Demo1234!` | owner | `/dashboard` |
| `ops1` | `Demo1234!` | ops | `/orders` |
| `bodega1` | `Demo1234!` | warehouse | `/inventory` |
| `transportista1` | `Demo1234!` | shipper | `/deliveries` |
| `vendedor1` | `Demo1234!` | vendor | `/pos` |
| `soporte1` | `Demo1234!` | support | `/alerts` |
| `cliente1` | `Demo1234!` | customer | `/tracking` |

> **Nota:** En el modo demo local, el login acepta cualquier contraseña para los usuarios listados. Los roles se asignan por nombre de usuario.

---

## Cargar datos de prueba

Los datos de prueba se cargan automáticamente al arrancar. Para recargarlos manualmente:

```bash
docker exec -i smartlogix-db psql -U postgres -d orders_db < Backend/seed.sql
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f orders-service

# Reconstruir un servicio sin derribar todo
docker compose up -d --build orders-service

# Detener todos los contenedores
docker compose down

# Detener y eliminar datos (borra BD)
docker compose down -v

# Estado de los contenedores
docker compose ps
```

---

## Frontend en producción (Vercel)

El frontend está desplegado en: **https://smartlogix-five.vercel.app**

Los rewrites de `vercel.json` redirigen `/api/*` al backend. Asegúrate de tener el backend accesible desde internet o configura `BACKEND_URL` en las variables de entorno de Vercel.

---

## Solución de problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Puerto 8080 en uso | Otra app ocupa el puerto | `docker compose down` y verificar con `netstat -ano \| findstr :8080` |
| BD no conecta | El contenedor postgres tardó en arrancar | Esperar 10s y reintentar `docker compose restart` |
| Frontend no conecta al backend | Proxy mal configurado | Verificar que el backend esté en `:8080` y Vite en `:3000` |
| `npm run dev` en otro puerto | Puerto 3000 en uso | Vite cambia automáticamente a `:3001`, `:3002`, etc. |
