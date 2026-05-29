# SmartLogix Frontend

SPA con React 18 + TypeScript + Vite + Tailwind CSS.

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
# http://localhost:3000
```

El proxy de Vite redirige `/api/*` al backend en `localhost:80`.

## Build
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

## Estructura
```
Frontend/
├── src/
│   ├── app/          # Auth, router
│   ├── components/   # UI components (shadcn)
│   ├── hooks/        # useApiQuery, useOperationalWorkspace
│   ├── lib/          # api-client, api-adapters, utils
│   ├── pages/        # Dashboard, Orders, Inventory, etc.
│   └── types/        # TypeScript types (api.ts, domain.ts)
├── vercel.json       # Vercel rewrites -> VM
├── vite.config.ts    # Vite + PWA config
└── package.json
```
