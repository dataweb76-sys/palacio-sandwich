-- ================================
-- AGREGAR COLUMNA ROLE A ADMIN
-- ================================
ALTER TABLE admin ADD COLUMN role TEXT DEFAULT 'admin';

-- ================================
-- ASIGNAR SUPERADMIN AL ID 1
-- (puede cambiarse si deseas otro)
-- ================================
UPDATE admin SET role='superadmin' WHERE id=1;

-- ================================
-- CREAR TABLA DE LOGS
-- ================================
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT,
  timestamp TEXT
);
