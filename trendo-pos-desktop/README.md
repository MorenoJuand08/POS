# Trendo POS Desktop (Electron + React + Tailwind, JS)

Aplicación de escritorio en JavaScript (sin TypeScript) con Electron, React y TailwindCSS. Se conecta a Supabase (Postgres) y funciona en modo offline-first con sincronización automática cuando vuelva el internet.

## Requisitos

- Node.js 18+
- Cuenta de Supabase y un proyecto con una tabla `items`:

```sql
create table if not exists public.items (
  id uuid primary key,
  title text not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);
-- Opcional: habilitar Realtime
alter publication supabase_realtime add table items;
```

## Variables de entorno

Crea un archivo `.env` en la raíz con:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_PUBLISHABLE_KEY
# Opcional: fuerza modo sin Supabase (útil para pruebas locales)
# VITE_USE_LOCAL_ONLY=true
```

> **Nota:** `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` reemplaza al antiguo `VITE_SUPABASE_ANON_KEY`. Si todavía usas el nombre viejo, la aplicación lo tomará como respaldo, pero se recomienda actualizar tu `.env`.

## Scripts

- `npm run dev`: abre la app en modo desarrollo (Electron + Vite)
- `npm run build`: compila main/preload/renderer
- `npm run package`: empaqueta para Windows (.exe con NSIS)
- `npm run lint`: linting con ESLint
- `npm run format`: formateo con Prettier

## Offline-first y sincronización

- Los datos se guardan localmente en IndexedDB (Dexie) con un esquema simple para `items`.
- Al estar offline, puedes crear/editar/eliminar. Los cambios quedan marcados como `dirty`.
- Al volver online, el servicio de sincronización:
  - Empuja cambios locales a Supabase (upsert/soft-delete)
  - Trae cambios del servidor más nuevos que `lastSyncedAt`
  - Resuelve conflictos por "último en escribir gana" usando `updated_at`.
- Se suscribe a Supabase Realtime para aplicar cambios en vivo mientras haya conexión.

Limitaciones: este es un esqueleto de ejemplo. Para casos complejos (conflictos por campo, transacciones múltiples) conviene un motor de sync dedicado.

## Estructura

- `src/main`: proceso principal de Electron
- `src/preload`: bridge seguro para exponer APIs al renderer
- `src/renderer`: front-end React + Tailwind
- `src/renderer/src/lib`: `supabase.js`, `db.js` (Dexie), `sync.js`

## Empaquetado a .exe

El empaquetado usa electron-builder con target NSIS para Windows.

1. Ejecuta `npm install`
2. Asegúrate de tener `.env` con las claves de Supabase
3. `npm run package`
4. El instalador `.exe` quedará en `dist/`/`release/` según configuración

## Notas

- Proyecto 100% JavaScript (sin TypeScript)
- Tailwind está configurado vía PostCSS
- Si necesitas SQLite local en lugar de IndexedDB, se puede integrar en el proceso main con un módulo nativo y exponer APIs por IPC.
