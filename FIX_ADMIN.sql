-- URBAN CLICK - REPARAR ACCESO ADMIN
-- Ejecutar una sola vez en la consola SQL de Cloudflare D1.
-- Usuario final: ADMIN
-- Contrasena final: ADMIN

DELETE FROM users WHERE usuario='ADMIN' OR id='USR-ADMIN';

INSERT INTO users
(id,nombre,usuario,password_hash,password_salt,rol,activo,creado,updated_at)
VALUES
('USR-ADMIN','MONICA FELIX ERQUICIA','ADMIN',
 'bf385ef85be0dc7bb521661310c13b60f402f68163237b8459a04aa58024dd44',
 'URBANCLICKADMIN2026','ADMIN',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

SELECT id,nombre,usuario,rol,activo FROM users WHERE usuario='ADMIN';
