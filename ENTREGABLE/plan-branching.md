# Plan de Branching -- SmartLogix

**Proyecto:** SmartLogix
**Repositorio:** https://github.com/JONAHBRUZZI/smartlogix
**Estrategia:** Trunk-Based Development
**Fecha:** Mayo 2026

---

## Estrategia

Trunk-Based Development con feature branches cortas. Una rama principal `main` donde cada commit es deployable. Features se desarrollan en branches de corta duracion (< 1 dia) y se mergean directo a main.

| Rama | Proposito |
|------|----------|
| `main` | Produccion. Cada commit es deployable. |

---

## Flujo de trabajo

```bash
git checkout -b feature/nombre    # Crear branch
git add -A && git commit -m "..." # Commits atomicos
git push origin feature/nombre    # Push
git checkout main && git merge    # Merge a main
git push                          # Deploy automatico
```

---

## Historial de commits

```
e61d0c7 docs: README general actualizado
b1bac5c docs: documentacion final para encargo
403c0e4 Eliminar SQS: flujo REST directo entre servicios
89f1808 Fix: rate limit xForwardedFor + validate array
e7f5583 Fix: shared modules + Dockerfiles contexto Backend
5ef9a50 Fix: /api/customers endpoint + nginx route
ce35a41 redeploy trigger dashboard
2bf9363 Fix DB_URL por servicio
adaa437 Fix vm.yml: service_started
6e91cbd Fix elasticmq healthcheck
d825f7c Frontend proxy puerto 80 + build Vercel
befadc1 Merge: fix healthcheck elasticmq (conflicto resuelto)
ce1d94c Documentacion Node-only
b2d4838 Limpiar leftovers Java
2910782 Fix CRITICAL + health endpoints
5724c79 Refactor backend a Node.js/Express
bc8bade Fix: ajuste inventario POST
def3311 Agregar Swagger/OpenAPI
460562a Reemplazo SNS por REST + compose VM
```

---

## Evidencia de conflictos resueltos

- **befadc1**: Conflicto en `docker-compose.node.yml`. Healthcheck de elasticmq incompatible. Resuelto removiendo healthcheck y usando `service_started`.
- **ce35a41**: Archivos generados por `vite.config.ts` en conflicto. Resuelto con `--ours`.

---

## Justificacion

Trunk-Based Development elegido por:
- Equipo de 1 persona (no requiere develop)
- CI/CD a Vercel y Docker Hub en cada push a main
- Commits atomicos con mensajes descriptivos
- Feature branches cortas evitan conflictos
