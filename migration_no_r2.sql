-- MIGRACION PARA QUIEN YA CREO LA BASE CON LA VERSION R2 Y TODAVIA NO TIENE FOTOS IMPORTANTES.
-- Si ya cargaste fotos en R2, exportalas antes de ejecutar esta migracion.

PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS garment_images;
CREATE TABLE garment_images (
  id TEXT PRIMARY KEY,
  prenda_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  image_data BLOB NOT NULL,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_images_prenda ON garment_images(prenda_id);
UPDATE app_meta SET revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=1;
