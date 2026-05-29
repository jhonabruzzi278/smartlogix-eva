# SmartLogix Frontend

SPA con React 18 + TypeScript 5.7 + Vite 6 + Tailwind CSS + shadcn/ui.

## Requisitos

- Node.js 22
- npm

## Instalacion

```bash
cd Frontend
npm install
```

## Desarrollo

```bash
npm run dev
# Abre http://localhost:3000
```

El proxy de Vite (`vite.config.ts`) redirige `/api/*` al backend en `http://localhost:80`.

## Build de produccion

```bash
npm run build
# Output: dist/
```

## Pruebas

```bash
npm test
npm run test:coverage
```

## Deploy a Vercel

```bash
npx vercel --prod
```

El archivo `vercel.json` configura los rewrites hacia la VM del backend.

## Estructura

```
Frontend/
├── public/               # Assets estaticos e iconos PWA
├── src/
│   ├── app/              # Auth, router, control de acceso
│   ├── components/
│   │   ├── common/       # MetricCard, PageHeader, etc.
│   │   ├── layout/       # AppShell, Sidebar, Topbar, MobileNav
│   │   └── ui/           # Componentes shadcn/ui (Button, Table, Sheet...)
│   ├── data/             # Datos mock
│   ├── hooks/            # useApiQuery, useOperationalWorkspace, usePermissions
│   ├── lib/              # api-client, api-adapters, utils, export-csv
│   ├── pages/            # 19 paginas (Dashboard, Orders, Inventory, POS...)
│   ├── styles/           # CSS global (Tailwind + utilidades mobile)
│   └── types/            # Tipos TypeScript (api.ts, domain.ts)
├── components.json       # Config shadcn/ui
├── tailwind.config.ts    # Config Tailwind
├── vite.config.ts        # Vite + PWA (vite-plugin-pwa)
├── vercel.json           # Rewrites Vercel -> VM backend
└── package.json
```

## Decisiones tecnicas

- **PWA**: Instalable en dispositivos moviles con soporte offline
- **Bottom nav (mobile)**: 4 secciones principales (Inicio, Vender, Stock, Pedidos)
- **Sidebar lateral (desktop)**: Navegacion completa con todas las secciones
- **Sheet drawer (mobile)**: Sidebar desplegable via hamburguesa
- **useApiQuery**: Hook generico para llamadas REST al backend con manejo de errores
- **useOperationalWorkspace**: Orquestador de estado (confirmar, cancelar, eliminar pedidos, ajustar inventario)
- **shadcn/ui**: Componentes accesibles y personalizables via CSS variables
