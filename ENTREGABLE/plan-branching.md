# Plan de Branching — SmartLogix

**Proyecto:** SmartLogix  
**Repositorio:** https://github.com/JONAHBRUZZI/smartlogix  
**Estrategia:** GitFlow adaptado  
**Fecha:** Mayo 2026

---

## 1. Estrategia de Branching Seleccionada: GitFlow Adaptado

Se seleccionó **GitFlow** como estrategia base con adaptaciones para el contexto del proyecto (equipo pequeño, desarrollo ágil, entregas continuas). GitFlow proporciona una estructura de ramas clara que separa el desarrollo activo de las versiones estables, facilitando la colaboración y el control de versiones.

### Ramas Principales

| Rama | Propósito | Reglas |
|---|---|---|
| `main` | Código en producción | Solo se mergea desde `develop` o `hotfix/*`. Cada commit en `main` es un release. |
| `develop` | Integración de features | Rama de trabajo principal. Aquí se integran todas las features antes de pasar a producción. |

### Ramas de Soporte

| Rama | Propósito | Nomenclatura | Se crea desde | Se mergea a |
|---|---|---|---|---|
| `feature/*` | Desarrollo de nuevas funcionalidades | `feature/nombre-descriptivo` | `develop` | `develop` |
| `release/*` | Preparación de versión para producción | `release/vX.Y.Z` | `develop` | `main` + `develop` |
| `hotfix/*` | Correcciones urgentes en producción | `hotfix/descripcion` | `main` | `main` + `develop` |

### Ramas de Desarrollador

Cada desarrollador tiene una rama personal donde integra sus features antes de mergear a `develop`. Esto permite trabajo aislado y revisión de código antes de la integración.

| Rama | Desarrollador | Responsabilidad | Módulos |
|---|---|---|---|
| `victor` | Víctor | Backend + Infraestructura | Microservicios (orders, inventory, shipping, notification), Docker, PostgreSQL, Nginx |
| `darlette` | Darlette | Frontend + Diseño | React SPA (inventario, pedidos, despachos), Landing Page Next.js, Tailwind CSS |

**Flujo de trabajo por desarrollador:**
```
victor ──── feature/backend-xyz ──→ victor ──PR──→ develop ──→ main
darlette ─ feature/frontend-xyz ─→ darlette ─PR──→ develop ──→ main
```

**Reglas:**
- Cada desarrollador trabaja features en su propia rama (`victor` o `darlette`)
- Para features colaborativas, crear `feature/*` desde `develop`
- Merge a `develop` solo mediante Pull Request con review del otro desarrollador
- Nunca pushear directo a `main` ni `develop`

---

## 2. Flujo de Trabajo

### 2.1 Desarrollo de Features

```
main ──────────────────────────────────────
       \
develop ──┬────┬────┬────────────────────
           \    \    \
            f1   f2   f3
```

**Procedimiento:**
1. Crear rama desde `develop`: `git checkout -b feature/nombre develop`
2. Desarrollar la funcionalidad con commits atómicos y descriptivos
3. Mantener la rama actualizada: `git merge develop` (diariamente)
4. Push a remoto: `git push origin feature/nombre`
5. Crear Pull Request hacia `develop`
6. Code review por otro miembro del equipo
7. Merge a `develop` (squash merge para mantener historial limpio)
8. Eliminar rama feature

### 2.2 Releases

```
main ──────────────────────●────
                            \
develop ──┬────┬────────────┬──
                            \
                        release/v1.0.0
```

**Procedimiento:**
1. Cuando `develop` tiene las features listas para release: `git checkout -b release/v1.0.0 develop`
2. Solo se permiten bugfixes y ajustes de documentación en la rama release
3. Testing final y QA
4. Merge a `main`: `git checkout main && git merge release/v1.0.0`
5. Taggear el release: `git tag -a v1.0.0 -m "Release v1.0.0"`
6. Merge de vuelta a `develop`: `git checkout develop && git merge release/v1.0.0`
7. Push con tags: `git push origin main develop --tags`
8. Eliminar rama release

### 2.3 Hotfixes

```
main ────●────────────●────
          \           /
      hotfix/critico
```

**Procedimiento:**
1. Crear desde `main`: `git checkout -b hotfix/critico main`
2. Corregir el bug con el mínimo cambio necesario
3. Testear en entorno de staging
4. Merge a `main`: `git checkout main && git merge hotfix/critico`
5. Taggear: `git tag -a v1.0.1 -m "Hotfix critico"`
6. Merge de vuelta a `develop`: `git checkout develop && git merge hotfix/critico`
7. Push con tags
8. Eliminar rama hotfix

---

## 3. Commits Implementados

### Historial real del proyecto (rama `main`)

```
2d604ac feat: landing v5 - mejora diseño visual
7aa2dd3 fix: corrige errores TypeScript en Frontend
7893b4c fix: landing v4 - ajusta diseño al template Transp
4cd8d7c feat: landing v3 - pricing parejo, servicios acordeon, emojis
736f018 feat: landing page mejorada - hero oscuro, testimonios, stats
7de6030 feat: landing page SmartLogix con diseño Transp
7744225 fix: docker-compose.prod.yml completo y corregido
f3208e3 feat: nuevo flujo de pedidos (confirm/cancel, QR, repartidor)
```

### Convención de Commits

Se utiliza [Conventional Commits](https://www.conventionalcommits.org/) para estandarizar los mensajes:

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat:` | Nueva funcionalidad | `feat: landing page con diseño Transp` |
| `fix:` | Corrección de bug | `fix: corrige errores TypeScript` |
| `refactor:` | Refactorización | `refactor: simplifica hook de autenticación` |
| `docs:` | Documentación | `docs: agrega README de arquitectura` |
| `test:` | Tests | `test: agrega pruebas unitarias de inventario` |
| `chore:` | Tareas de mantenimiento | `chore: actualiza dependencias` |

---

## 4. Gestión de Conflictos

### 4.1 Prevención
- Sincronización diaria con `develop` (`git merge develop` en ramas feature)
- Comunicación del equipo sobre archivos en edición
- Commits pequeños y frecuentes

### 4.2 Resolución
Cuando ocurre un conflicto en merge:

```bash
git checkout develop
git pull origin develop
git checkout feature/mi-feature
git merge develop
# Resolver conflictos manualmente en los archivos marcados
git add <archivos-resueltos>
git commit -m "merge: resuelve conflictos con develop"
git push origin feature/mi-feature
```

### 4.3 Ejemplo documentado
En el commit `7744225`, se resolvió un conflicto en `docker-compose.prod.yml` donde dos features concurrentes modificaron el mismo archivo (agregar orders-service y corregir postgres-db). La resolución mantuvo ambas adiciones en el orden correcto de dependencias.

---

## 5. Herramientas y Configuración

### 5.1 .gitignore
Se excluyen del versionado:
- `node_modules/` (dependencias frontend)
- `.next/` y `dist/` (builds)
- `.env` (variables de entorno locales)
- `postgres_data/` (datos de BD locales)

### 5.2 Protección de Ramas (GitHub)
- `main`: Requiere Pull Request + 1 review aprobatoria
- No se permiten pushes directos a `main`

### 5.3 Integración Continua
Cada push a cualquier rama ejecuta:
- Build del frontend (`npm run build`)
- Build del landing (`npx next build`)

---

## 6. Diagrama de Flujo GitFlow

```
                              v1.0.0            v1.0.1
main  ────────●───────────────●─────────────●────────────
              ↑               ↑              ↑
              │               │              │
develop ──┬───●───┬───────┬───●──────────┬──●────────
          │       │       │              │
          │       │       │              │
victor  ──●──┬────●───────●── ....       │
             │    │                      │
darlette ────●────●──────────────────────●── ....
          f1   f2   f3                  hotfix

Leyenda:
  ● = merge / commit
  → = PR review requerido
```

---

## 7. Conclusión

La estrategia GitFlow adaptada proporciona:

1. **Separación clara** entre desarrollo (`develop`) y producción (`main`)
2. **Aislamiento de features** en ramas dedicadas que no interfieren entre sí
3. **Control de calidad** mediante releases antes de producción
4. **Respuesta rápida** a bugs en producción mediante hotfixes
5. **Trazabilidad completa** con Conventional Commits y tags de versión

Esta estrategia ha permitido al equipo desarrollar más de 10 features en paralelo sin conflictos bloqueantes, mantener múltiples versiones de la aplicación y realizar despliegues continuos a producción.
