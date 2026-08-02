# Dashboard Estadísticas

Dashboard responsive en React, TypeScript, Vite y Supabase.

## Inicio

```bash
npm install
npm run dev
```

La conexión local está configurada en `.env.local`. Para crear la tabla y los datos iniciales, ejecutá `supabase/migrations/001_metricas.sql` en el SQL Editor de Supabase.

## Producción

Configurá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el proveedor de hosting. La clave publicable puede usarse en el navegador; nunca agregues una clave `service_role` al frontend.
