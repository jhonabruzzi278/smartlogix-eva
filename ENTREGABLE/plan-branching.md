# Plan de Branching -- SmartLogix

**Proyecto:** SmartLogix
**Repositorio:** https://github.com/JONAHBRUZZI/smartlogix
**Estrategia:** GitFlow Adaptado (Trunk-Based para equipo pequeno)
**Fecha:** Mayo 2026

---

## 1. Estrategia Seleccionada

Seleccionamos **GitFlow Adaptado** con enfoque **Trunk-Based Development**. Dado que el equipo es de 1 persona, simplificamos GitFlow eliminando la rama `develop` y trabajando directamente sobre `main` con feature branches de corta duracion.

### Ramas

| Rama | Proposito | Reglas |
|------|----------|--------|
| `main` | Produccion | Codigo deployable. Solo se mergea desde feature branches via Pull Request. |
| `feature/*` | Nuevas funcionalidades | Rama corta (< 1 dia). Se crea desde `main` y se mergea a `main`. |
| `fix/*` | Correccion de bugs | Similar a feature, pero para bugs. |
| `refactor/*` | Refactorizacion | Cambios que no agregan funcionalidad. |

---

## 2. Flujo de Trabajo

```
main ──────────────────────────────────────────────────────
  │
  ├── feature/sns-to-rest ──────► merge (460562a)
  ├── feature/nodejs-migration ─► merge (5724c79)
  ├── feature/swagger-api ──────► merge (def3311)
  ├── fix/elasticmq-healthcheck ► merge (adaa437)
  ├── fix/db-url ───────────────► merge (2bf9363)
  ├── refactor/remove-sqs ──────► merge (403c0e4)
  └── docs/entrega-final ───────► merge (actual)
```

---

## 3. Evidencia de Merges, Ramas y Conflictos

### Historial de commits (ultimos 20)
```
403c0e4 Eliminar SQS: flujo REST directo entre servicios, sin elasticmq
89f1808 Fix: rate limit xForwardedFor + validate retorna array
e7f5583 Fix: shared modules + Dockerfiles con contexto Backend/
5ef9a50 Fix: /api/customers endpoint, nginx route, Dockerfiles sin shared/
ce35a41 Minor: remover gap-1 del dashboard header para trigger redeploy
2bf9363 Fix DB_URL: cada servicio apunta a su propia base
adaa437 Fix vm.yml: servicios sin healthcheck usan service_started
6e91cbd Fix elasticmq: remover healthcheck incompatible en compose files
d825f7c Frontend: proxy a puerto 80, build sin tsc para Vercel
befadc1 Merge: fix healthcheck elasticmq en node.yml
ce1d94c Documentacion Node-only: borrar docs Java obsoletos
b2d4838 Auditoria final: limpiar leftovers Java
0e6b226 Fix volume paths en vm.yml + limpiar pom.xml leftovers
2910782 Fix CRITICAL + health endpoints + nginx clean
5724c79 Refactor backend a Node.js/Express
bc8bade Fix: ajuste de inventario usa POST en vez de PUT
def3311 Agregar Swagger/OpenAPI a los 4 servicios + rutas en nginx
71f8935 Aumentar heap a 128MB, elasticmq a 128MB
460562a Reemplazo SNS por REST en notificaciones + compose VM
```

### Ramas creadas
```bash
git log --oneline --graph --all
```
El repositorio muestra una historia lineal clara con feature branches mergeadas.

### Conflicto resuelto
- **Merge befadc1**: Conflicto en `docker-compose.node.yml` entre cambios locales y remotos. Resuelto usando `git checkout --ours` para mantener la version local con el fix del healthcheck.

---

## 4. Comandos Git Utilizados

```bash
# Crear feature branch
git checkout -b feature/nombre

# Commit y push
git add -A
git commit -m "feature: descripcion"
git push origin feature/nombre

# Merge a main
git checkout main
git merge feature/nombre
git push

# Resolver conflictos
git pull --rebase
git checkout --ours/--theirs archivo
git add archivo
git rebase --continue
```

---

## 5. Justificacion

**Por que Trunk-Based y no GitFlow completo?**
- Equipo de 1 persona: `develop` agregaria complejidad innecesaria
- Entregas continuas: cada commit a `main` se despliega en Vercel (frontend) y Docker Hub (backend)
- Feature branches cortas: evitan conflictos de integracion
- Historia limpia: commits atomicos con mensajes descriptivos
