PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS app_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO app_meta (id, revision) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('ADMIN','VISITA')),
  activo INTEGER NOT NULL DEFAULT 1,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ADMIN FIJO: usuario ADMIN / contrasena ADMIN.
-- Se elimina cualquier fila ADMIN anterior para evitar que una base reutilizada conserve otra contrasena.
DELETE FROM users WHERE usuario='ADMIN' OR id='USR-ADMIN';
INSERT INTO users
(id,nombre,usuario,password_hash,password_salt,rol,activo,creado,updated_at)
VALUES
('USR-ADMIN','MONICA FELIX ERQUICIA','ADMIN','bf385ef85be0dc7bb521661310c13b60f402f68163237b8459a04aa58024dd44','URBANCLICKADMIN2026','ADMIN',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);


CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS tallas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tallas (id,nombre,tipo) VALUES
('SZ-XS','XS','LETRA'),('SZ-S','S','LETRA'),('SZ-M','M','LETRA'),('SZ-L','L','LETRA'),('SZ-XL','XL','LETRA'),('SZ-XXL','XXL','LETRA'),
('SZ-34','34','NUMERICA'),('SZ-36','36','NUMERICA'),('SZ-38','38','NUMERICA'),('SZ-40','40','NUMERICA'),('SZ-42','42','NUMERICA');

CREATE TABLE IF NOT EXISTS stocks (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  costo_total REAL NOT NULL DEFAULT 0,
  costo_unitario REAL NOT NULL DEFAULT 0,
  proveedor TEXT NOT NULL DEFAULT '',
  proveedor_celular TEXT NOT NULL DEFAULT '',
  proveedor_ciudad TEXT NOT NULL DEFAULT '',
  proveedor_detalle TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stocks_fecha ON stocks(fecha);

CREATE TABLE IF NOT EXISTS prendas (
  id TEXT PRIMARY KEY,
  stock_id TEXT NOT NULL,
  detalle TEXT NOT NULL,
  marca TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  genero TEXT NOT NULL DEFAULT 'MUJER',
  talla TEXT NOT NULL DEFAULT '',
  costo_unitario REAL NOT NULL DEFAULT 0,
  precio_venta REAL NOT NULL DEFAULT 0,
  estado_prenda TEXT NOT NULL DEFAULT 'DISPONIBLE',
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prendas_stock ON prendas(stock_id);
CREATE INDEX IF NOT EXISTS idx_prendas_estado ON prendas(estado_prenda);
CREATE INDEX IF NOT EXISTS idx_prendas_talla ON prendas(talla);

CREATE TABLE IF NOT EXISTS ventas (
  id TEXT PRIMARY KEY,
  prenda_id TEXT NOT NULL,
  stock_id TEXT NOT NULL,
  cliente TEXT NOT NULL,
  celular TEXT NOT NULL DEFAULT '',
  fecha_venta TEXT NOT NULL,
  fecha_entrega TEXT NOT NULL DEFAULT '',
  estado_entrega TEXT NOT NULL DEFAULT 'ENTREGADO',
  metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
  precio_venta REAL NOT NULL DEFAULT 0,
  costo_unitario REAL NOT NULL DEFAULT 0,
  margen REAL NOT NULL DEFAULT 0,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_prenda_unique ON ventas(prenda_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_stock ON ventas(stock_id);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente);

CREATE TABLE IF NOT EXISTS garment_images (
  id TEXT PRIMARY KEY,
  prenda_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  image_data BLOB NOT NULL,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_images_prenda ON garment_images(prenda_id);
