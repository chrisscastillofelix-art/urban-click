# URBAN CLICK EN CLOUDFLARE · SOLO D1 · SIN AUTH_SECRET

Esta version usa Cloudflare D1 para datos, fotos y sesiones. No usa R2 y NO necesita AUTH_SECRET.

## SI YA TIENES EL PROYECTO PUBLICADO

1. Sube/reemplaza los archivos de esta version en GitHub.
2. En Cloudflare D1 abre tu base `urban-click-db`.
3. En Console ejecuta TODO `MIGRACION_SESIONES.sql`.
4. En tu proyecto Pages verifica **Bindings > D1 database**:
   - Variable name: `DB`
   - Database: `urban-click-db`
5. No agregues AUTH_SECRET. Ya no se usa.
6. Haz un nuevo despliegue. Si no aparece Retry, haz un commit minimo en GitHub; Pages despliega automaticamente.
7. Abre la web en una ventana privada o borra las cookies del dominio.
8. Ingresa con `admin` / `admin`.

## SI EMPIEZAS DESDE CERO

1. Crea una D1 llamada `urban-click-db`.
2. Ejecuta todo `schema.sql`.
3. Crea un proyecto **Cloudflare Pages conectado a GitHub**, no un Worker de solo assets.
4. Framework preset: None. Build command: `exit 0`. Output directory: `.`
5. Vincula D1 con variable exacta `DB`.
6. Publica.

## COMO COMPROBAR QUE EL BACKEND FUNCIONA

Abre en el navegador:

`https://TU-DOMINIO.pages.dev/api/health`

Debe responder algo como:

`{"ok":true,"service":"URBAN CLICK API","db":true,"sessions":"D1"}`

Si devuelve 404 o HTML, la carpeta `functions/` no se desplego como Pages Functions.
Si `db` aparece false, falta el binding `DB`.

## ACCESO

Usuario: `admin`
Contrasena: `admin`
