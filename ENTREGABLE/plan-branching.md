# Plan de Branching (Estrategia de Ramas)

**Proyecto:** SmartLogix
**Repositorio:** https://github.com/JONAHBRUZZI/smartlogix
**Estrategia:** GitHub Flow (simplificada)

---

## Estrategia elegida: GitHub Flow

SmartLogix usa una estrategia de branching basada en **GitHub Flow**, que es una simplificacion de GitFlow adecuada para equipos pequeños y despliegue continuo.

### ¿Por que GitHub Flow?

- **Simplicidad:** Solo 2 tipos de ramas (main + feature branches).
- **Despliegue continuo:** Cada merge a `main` dispara el deploy automatico a Vercel (frontend).
- **Equipo pequeño:** No se necesita la complejidad de GitFlow (develop, release, hotfix).
- **Integracion con Vercel:** Vercel hace preview deployments por cada PR, facilitando la revision.

---

## Estructura de ramas

```
main (produccion)
  │
  ├── feature/nombre-descriptivo
  ├── fix/nombre-del-bug
  └── docs/actualizacion-readme
```

### Rama principal: `main`

- **Proposito:** Codigo listo para produccion.
- **Regla:** Nunca se hace push directo a `main`.
- **Proteccion:** Vercel escucha `main` y despliega automaticamente a https://smartlogix-five.vercel.app.
- **Estado esperado:** Siempre compila y pasa los tests.

### Ramas de trabajo

| Prefijo | Proposito | Ejemplo |
|---------|----------|---------|
| `feature/` | Nueva funcionalidad | `feature/order-delete-endpoint` |
| `fix/` | Correccion de bug | `fix/null-slice-error` |
| `docs/` | Documentacion | `docs/readme-microservicios` |

---

## Flujo de trabajo paso a paso

### 1. Crear rama desde main

```bash
git checkout main
git pull origin main
git checkout -b feature/mi-funcionalidad
```

### 2. Desarrollar y commitear

```bash
# Hacer cambios...
git add -A
git commit -m "feat: descripcion breve del cambio"
git push origin feature/mi-funcionalidad
```

### 3. Crear Pull Request en GitHub

- Desde `feature/mi-funcionalidad` hacia `main`
- Vercel crea un **preview deployment** automatico con URL unica
- Revisar el preview antes de mergear

### 4. Merge a main

- Usar **Squash and Merge** para mantener el historial de `main` limpio
- El merge dispara el deploy a produccion en Vercel

### 5. Actualizar VM del backend (si aplica)

```bash
# SSH a la VM de produccion
ssh root@104.248.60.29
cd ~/smartlogix
git pull origin main
docker compose -f docker-compose.vm.yml up -d
```

---

## Convencion de commits

Se sigue el formato de **Conventional Commits**:

```
<tipo>: <descripcion breve>

[opcional: cuerpo con mas detalle]
```

**Tipos:**

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Correccion de bug |
| `docs` | Cambios en documentacion |
| `style` | Formato, espacios, punto-y-coma (sin cambio de logica) |
| `refactor` | Refactorizacion de codigo |
| `test` | Agregar o corregir tests |
| `chore` | Tareas de build, config, dependencias |

**Ejemplos:**
```
feat: agregar endpoint DELETE para pedidos
fix: evitar error .slice() en null al cargar detalle de pedido
docs: crear README para cada microservicio
chore: eliminar archivos CloudFormation no usados
```

---

## Ramas activas actuales

| Rama | Estado | Proposito |
|------|--------|----------|
| `main` | Activa | Produccion |

---

## Reglas

1. `main` siempre debe compilar (`npm run build` exitoso)
2. No hacer push directo a `main` (usar PR)
3. Cada commit debe tener un mensaje descriptivo
4. Usar prefijos de Conventional Commits
5. Los PRs deben revisarse antes de mergear (idealmente)
6. Mantener las ramas de feature efimeras (borrar despues del merge)
