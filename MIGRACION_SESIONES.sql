-- URBAN CLICK - SESIONES EN D1 (SIN AUTH_SECRET)
-- Ejecutar una sola vez en la consola SQL de la base urban-click-db.

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

-- Reparar el ADMIN solicitado: ADMIN / ADMIN
DELETE FROM users WHERE usuario='ADMIN' OR id='USR-ADMIN';
INSERT INTO users
(id,nombre,usuario,password_hash,password_salt,rol,activo,creado,updated_at)
VALUES
('USR-ADMIN','MONICA FELIX ERQUICIA','ADMIN',
 'bf385ef85be0dc7bb521661310c13b60f402f68163237b8459a04aa58024dd44',
 'URBANCLICKADMIN2026','ADMIN',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

DELETE FROM sessions;
SELECT id,nombre,usuario,rol,activo FROM users WHERE usuario='ADMIN';
