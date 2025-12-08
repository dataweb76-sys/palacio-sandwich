// C:\El palacio del sándwich\server\database.js

const sqlite3 = require("sqlite3").verbose();

// Apertura de la base de datos
const db = new sqlite3.Database("./palacio.db");

// =========================
// TABLA CONFIG (ENVÍOS)
// =========================
db.run(`
  CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT
  )
`);

// CONFIGURACIÓN BASE
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_costo','800')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_gratis_desde','5000')`);

// NUEVOS CAMPOS PARA DISTANCIAS
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_10','800')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_20','1200')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_30','1800')`);
db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_40','2500')`);

db.serialize(() => {

  // ============================
  // TABLA ADMIN
  // ============================
  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT UNIQUE,
      pass TEXT,
      role TEXT DEFAULT 'admin'
    )
  `);

  // Crear usuario inicial si no existe
  db.get("SELECT COUNT(*) AS c FROM admin", (err, row) => {
    if (err) return console.error(err);
    if (row.c === 0) {
      db.run(
        "INSERT INTO admin (user, pass, role) VALUES (?, ?, ?)",
        ["admin", "admin123", "superadmin"]
      );
    }
  });

  // Asegurar columna ROLE
  db.all("PRAGMA table_info(admin)", (err, rows) => {
    if (err) return console.error(err);

    const cols = rows.map(r => r.name);

    if (!cols.includes("role")) {
      console.log("Agregando columna 'role' a admin...");
      db.run("ALTER TABLE admin ADD COLUMN role TEXT DEFAULT 'admin'");
    }

    db.run("UPDATE admin SET role='superadmin' WHERE id=1");
  });

  // ============================
  // TABLA CATEGORIES
  // ============================
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      tipo TEXT DEFAULT 'producto'
    )
  `);

  // Asegurar columnas extra
  const categoryExtraColumns = [
    { name: "image", sql: "ALTER TABLE categories ADD COLUMN image TEXT" },
    { name: "banner", sql: "ALTER TABLE categories ADD COLUMN banner TEXT" },
    { name: "color", sql: "ALTER TABLE categories ADD COLUMN color TEXT" },
    { name: "orden", sql: "ALTER TABLE categories ADD COLUMN orden INTEGER DEFAULT 0" },
    { name: "visible", sql: "ALTER TABLE categories ADD COLUMN visible INTEGER DEFAULT 1" },
    { name: "descripcion", sql: "ALTER TABLE categories ADD COLUMN descripcion TEXT" },
    { name: "style", sql: "ALTER TABLE categories ADD COLUMN style TEXT" }
  ];

  db.all("PRAGMA table_info(categories)", (err, rows) => {
    if (err) return console.error(err);

    const cols = rows.map(r => r.name);

    categoryExtraColumns.forEach(col => {
      if (!cols.includes(col.name)) {
        db.run(col.sql, () => {});
      }
    });
  });

  // ============================
  // TABLA PRODUCTOS
  // ============================
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

  // ============================
  // TABLA PROMOS
  // ============================
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

  // ============================
  // TABLA VENTAS
  // ============================
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

  // ============================
  // TABLA PEDIDOS (extendida)
  // ============================
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

  // Asegurar columnas extra en PEDIDOS (por si la tabla es vieja)
  db.all("PRAGMA table_info(pedidos)", (err, rows) => {
    if (err) return console.error(err);

    const cols = rows.map(r => r.name);

    const pedidosExtraColumns = [
      { name: "telefono", sql: "ALTER TABLE pedidos ADD COLUMN telefono TEXT" },
      { name: "direccion", sql: "ALTER TABLE pedidos ADD COLUMN direccion TEXT" },
      { name: "hora_entrega", sql: "ALTER TABLE pedidos ADD COLUMN hora_entrega TEXT" },
      { name: "envio", sql: "ALTER TABLE pedidos ADD COLUMN envio REAL DEFAULT 0" },
      { name: "distancia_km", sql: "ALTER TABLE pedidos ADD COLUMN distancia_km REAL DEFAULT 0" },
      { name: "comprobanteQR", sql: "ALTER TABLE pedidos ADD COLUMN comprobanteQR TEXT" },
      { name: "tipo", sql: "ALTER TABLE pedidos ADD COLUMN tipo TEXT DEFAULT 'local'" },
      { name: "estado", sql: "ALTER TABLE pedidos ADD COLUMN estado TEXT DEFAULT 'pendiente'" },
      { name: "pagado", sql: "ALTER TABLE pedidos ADD COLUMN pagado INTEGER DEFAULT 0" }
    ];

    pedidosExtraColumns.forEach(col => {
      if (!cols.includes(col.name)) {
        db.run(col.sql, () => {});
      }
    });
  });

  // ============================
  // TABLA LOGS
  // ============================
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      timestamp TEXT
    )
  `);

  // ============================
  // TABLA RESERVAS
  // ============================
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

  // ============================
  // TABLA CLIENTES
  // ============================
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

  // ============================
  // TABLA HISTORIAL CLIENTES
  // ============================
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

});

module.exports = db;
