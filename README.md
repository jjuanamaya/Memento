# Memento — Web

Prototipo de la app de cajas temáticas Memento. Ver la especificación completa del proyecto en [`../docs/ESPECIFICACION.md`](../docs/ESPECIFICACION.md).

## Estado actual

Conectado a un proyecto real de Supabase (auth, base de datos y RLS activos). Ver el detalle completo en la sección 9 de [`../docs/ESPECIFICACION.md`](../docs/ESPECIFICACION.md).

- Interfaz cliente: home, armado de caja + checkout (`/armar`, wizard de 4 pasos), mis pedidos, login/registro — todo con datos y auth reales.
- Interfaz admin: `/admin` (dashboard con gráficos), `/admin/pedidos`, `/admin/suscripciones`, `/admin/stock` (productos, movimientos de entrada/salida con comprobante imprimible, y proveedores), todas protegidas por rol.

## Correr en desarrollo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Necesita `.env.local` con las credenciales del proyecto de Supabase (ver `.env.example`).

## Próximo paso

Ver la sección 10 de `../docs/ESPECIFICACION.md` ("Próximos pasos sugeridos") — hoy lo principal es imágenes de producto, catálogo real, y decidir si combos/suscripciones entran en el lanzamiento inicial.
