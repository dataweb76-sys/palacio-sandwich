const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Render solo permite escribir en /tmp
const dbPath = process.env.RENDER
  ? path.join("/tmp", "palacio.db")
  : path.join(__dirname, "palacio.db");

console.log("Base de datos cargada desde:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error abriendo DB:", err);
});

// ======================================
// TODAS TUS TABLAS (NO CAMBIÉ NADA ADENTRO)
// ======================================

db.run(`
  CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT
  )
`);

db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_costo','800')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_gratis_desde','5000')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_10','800')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_20','1200')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_30','1800')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_40','2500')`);

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS notas_clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono TEXT,
      nota TEXT,
      admin TEXT,
      fecha TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT UNIQUE,
      pass TEXT,
      role TEXT DEFAULT 'admin'
    )
  `);

  db.get("SELECT COUNT(*) AS c FROM admin", (err, row) => {
    if (row.c === 0) {
      db.run(
        "INSERT INTO admin (user, pass, role) VALUES (?, ?, ?)",
        ["admin", "admin123", "superadmin"]
      );
    }
  });

  db.all("PRAGMA table_info(admin)", (err, rows) => {
    const cols = rows.map(r => r.name);
    if (!cols.includes("role")) {
      db.run("ALTER TABLE admin ADD COLUMN role TEXT DEFAULT 'admin'");
    }
    db.run("UPDATE admin SET role='superadmin' WHERE id=1");
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      tipo TEXT DEFAULT 'producto'
    )
  `);

  const extraCols = [
    { name: "image", sql: "ALTER TABLE categories ADD COLUMN image TEXT" },
    { name: "banner", sql: "ALTER TABLE categories ADD COLUMN banner TEXT" },
    { name: "color", sql: "ALTER TABLE categories ADD COLUMN color TEXT" },
    { name: "orden", sql: "ALTER TABLE categories ADD COLUMN orden INTEGER DEFAULT 0" },
    { name: "visible", sql: "ALTER TABLE categories ADD COLUMN visible INTEGER DEFAULT 1" },
    { name: "descripcion", sql: "ALTER TABLE categories ADD COLUMN descripcion TEXT" },
    { name: "style", sql: "ALTER TABLE categories ADD COLUMN style TEXT" }
  ];

  db.all("PRAGMA table_info(categories)", (err, rows) => {
    const cols = rows.map(r => r.name);
    extraCols.forEach(col => { if (!cols.includes(col.name)) db.run(col.sql); });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      image TEXT,
      description TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      stock_alert INTEGER DEFAULT 2,
      multiprecios TEXT DEFAULT '[]'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      image TEXT,
      price REAL,
      categoria TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER,
      producto_nombre TEXT,
      cantidad INTEGER,
      precio_unitario REAL,
      precio_total REAL,
      fecha TEXT,
      metodo_envio TEXT,
      costo_envio REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT,
      telefono TEXT,
      direccion TEXT,
      hora_entrega TEXT,
      forma_pago TEXT,
      total REAL,
      envio REAL,
      distancia_km REAL,
      items_json TEXT,
      comprobanteQR TEXT,
      tipo TEXT,
      estado TEXT DEFAULT 'pendiente',
      pagado INTEGER DEFAULT 0,
      fecha_hora TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      timestamp TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      detalle TEXT,
      fecha_reserva TEXT,
      estado TEXT DEFAULT 'pendiente',
      fecha_confirmacion TEXT,
      creado TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      telefono TEXT UNIQUE,
      total_gastado REAL DEFAULT 0,
      cantidad_pedidos INTEGER DEFAULT 0,
      ultima_compra TEXT,
      items_frecuentes_json TEXT,
      creado_en TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS historial_clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono TEXT,
      nombre_cliente TEXT,
      total REAL,
      items_json TEXT,
      fecha TEXT,
      admin TEXT,
      tipo TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS estado_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER,
      estado TEXT,
      admin TEXT,
      comentario TEXT,
      fecha TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservas_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id INTEGER,
      nombre TEXT,
      apellido TEXT,
      telefono TEXT,
      codigo_postal TEXT,
      provincia TEXT,
      domicilio TEXT,
      ciudad TEXT,
      fecha_reserva TEXT,
      hora TEXT,
      tipo_evento TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservas_productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id INTEGER,
      producto TEXT,
      cantidad INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservas_presupuestos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id INTEGER,
      presupuesto_json TEXT,
      envio REAL,
      total REAL,
      fecha TEXT,
      estado TEXT DEFAULT 'presupuestado'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservas_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id INTEGER,
      estado TEXT,
      admin TEXT,
      comentario TEXT,
      fecha TEXT
    )
  `);
});

module.exports = db;
