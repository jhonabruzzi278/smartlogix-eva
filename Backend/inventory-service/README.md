# inventory-service

Microservicio de control de inventario y ventas. Node.js 22 + Express 4 + PostgreSQL.

## Responsabilidad

Gestiona el catalogo de productos, el stock y el registro de ventas. Proporciona ajustes atomicos de inventario.

## Puerto

`8082` | Base de datos: `inventory_db`

## Dependencias

- express, pg, helmet, cors, express-rate-limit, uuid
- shared/ (app, db, logger, validate, security, shutdown)

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/inventory | Listar todos los productos |
| GET | /api/inventory/:sku | Consultar un producto por SKU |
| POST | /api/inventory | Agregar producto `{sku, name, stock, price, cost, category}` |
| DELETE | /api/inventory/:sku | Eliminar producto |
| POST | /api/inventory/:sku/adjust?delta=N | Ajuste atomico de stock (+/-). Si delta < 0, registra venta |
| GET | /api/sales | Listar historial de ventas |
| POST | /api/sales | Registrar venta directa `{items, total, paymentMethod, vendorId, vendorName}` |

## Reglas de negocio

- El ajuste de stock es atomico: no permite stock negativo (`stock + delta >= 0`)
- Los ajustes negativos registran automaticamente una venta en la tabla `sales`
- Cada producto tiene: sku, name, stock, price, cost, category

## Categorias de producto

- `bebidas` - Bebidas
- `snacks` - Snacks y golosinas
- `lacteos` - Lacteos
- `limpieza` - Articulos de limpieza
- `varios` - Otros productos

## Ejecucion

### Con Docker (recomendado)

```bash
# Desde la raiz del proyecto
docker compose -f docker-compose.node.yml up -d --build
```

### Sin Docker (desarrollo)

```bash
cd Backend/inventory-service
npm install
DB_URL=postgresql://postgres:postgres@localhost:5432/inventory_db node src/index.js
```

## Variables de entorno

| Variable | Default | Descripcion |
|----------|---------|-------------|
| PORT | 8082 | Puerto HTTP |
| DB_URL | postgresql://postgres:postgres@postgres-db:5432/inventory_db | Conexion BD |
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
