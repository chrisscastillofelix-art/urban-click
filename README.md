# URBAN CLICK - Cloudflare Pages + D1

Estructura corregida para Pages Functions:

- `public/` = archivos estáticos que Cloudflare publica.
- `functions/` = backend Pages Functions, fuera de `public/`.
- `schema.sql` y migraciones = configuración de D1.

## Configuración Cloudflare Pages
- Framework preset: None
- Build command: `exit 0`
- Build output directory: `public`
- Root directory: dejar vacío

## Binding
- D1 database
- Variable name: `DB`
- Database: urban-click-db

No requiere AUTH_SECRET ni R2.
REDEPLOY
