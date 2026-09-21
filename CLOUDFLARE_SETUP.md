# PUBLICACION CORRECTA

1. Suba TODO este contenido a la raíz del repositorio GitHub.
2. En Cloudflare Pages use:
   - Framework: None
   - Build command: `exit 0`
   - Build output directory: `public`
   - Root directory: vacío
3. Conecte D1 en Bindings:
   - Variable: `DB`
   - Base: `urban-click-db`
4. No use AUTH_SECRET.
5. No use R2.
6. Después del deploy, visite `/api/health`.

Debe responder algo similar a:
{"ok":true,"service":"URBAN CLICK API","db":true,"sessions":"D1"}
