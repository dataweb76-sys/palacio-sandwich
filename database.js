// database.js — PostgreSQL en Railway con misma API que sqlite (db.all / db.get / db.run)

const { Pool } = require("pg");

// ⚠️ Necesitás DATABASE_URL en tu .env (local) o en Railway
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: Falta la variable DATABASE_URL");
  console.error("Ponela en .env, ejemplo:");
  console.error("DATABASE_URL=postgres://usuario:pass@host:puerto/base");
  process.exit(1);
}

const isProd = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false
});

// =========================
// Helpers para imitar sqlite
// =========================

// Reemplaza "?" por $1, $2, ... para PostgreSQL
function mapPlaceholders(sql, params = []) {
  let i = 0;
  const text = sql.replace(/\?/g, () => {
    i += 1;
    return `$${i}`;
  });
  return { text, values: params };
}

// Permite db.xxx(sql, params, cb) o db.xxx(sql, cb)
function parseArgs(args) {
  const [sql, a, b] = args;
  let params;
  let cb;
  if (typeof a === "function") {
    cb = a;
    params = [];
  } else {
    params = a || [];
    cb = b;
  }
  return { sql, params, cb };
}

const db = {
  // db.all(sql, params?, cb)
  all(...args) {
    const { sql, params, cb } = parseArgs(args);
    const { text, values } = mapPlaceholders(sql, params);

    pool
      .query(text, values)
      .then((res) => cb && cb(null, res.rows))
      .catch((err) => cb && cb(err));
  },

  // db.get(sql, params?, cb) => una sola fila
  get(...args) {
    const { sql, params, cb } = parseArgs(args);
    const { text, values } = mapPlaceholders(sql, params);

    pool
      .query(text, values)
      .then((res) => cb && cb(null, res.rows[0] || null))
      .catch((err) => cb && cb(err));
  },

  // db.run(sql, params?, cb) — imitamos this.lastID con INSERT ... RETURNING id
  run(...args) {
    const { sql, params, cb } = parseArgs(args);
    let sqlToUse = sql;

    // Si es un INSERT y no tiene RETURNING, se lo agregamos para poder dar lastID
    if (/^\s*insert/i.test(sqlToUse) && !/returning/i.test(sqlToUse)) {
      sqlToUse += " RETURNING id";
    }

    const { text, values } = mapPlaceholders(sqlToUse, params);

    pool
      .query(text, values)
      .then((res) => {
        if (cb) {
          const ctx = {
            lastID: res.rows && res.rows[0] && res.rows[0].id
          };
          cb.call(ctx, null);
        }
      })
      .catch((err) => cb && cb(err));
  },

  pool
};

// =========================
// Migración / creación de tablas
// =========================

async function initSchema() {
  console.log("🚀 Inicializando esquema PostgreSQL...");

  // Config
  await pool.query(`
    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT
    )
  `);

  await pool.query(`
    INSERT INTO config (clave, valor) VALUES
      ('envio_costo','800'),
      ('envio_gratis_desde','5000'),
      ('envio_10','800'),
      ('envio_20','1200'),
      ('envio_30','1800'),
      ('envio_40','2500')
    ON CONFLICT (clave) DO NOTHING
  `);

  // Notas clientes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notas_clientes (
      id SERIAL PRIMARY KEY,
      telefono TEXT,
      nota TEXT,
      admin TEXT,
      fecha TEXT
    )
  `);

  // Admin
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin (
      id SERIAL PRIMARY KEY,
      user TEXT UNIQUE,
      pass TEXT,
      role TEXT DEFAULT 'admin'
    )
  `);

  // Usuario admin default
  await pool.query(`
    INSERT INTO admin (user, pass, role)
    VALUES ('admin', 'admin123', 'superadmin')
    ON CONFLICT (user) DO NOTHING
  `);

  // Categories (ya con todas las columnas nuevas)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      nombre TEXT UNIQUE,
      tipo TEXT DEFAULT 'producto',
      image TEXT,
      banner TEXT,
      color TEXT,
      orden INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      descripcion TEXT,
      style TEXT
    )
  `);

  // Products
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
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

  // Promos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promos (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      image TEXT,
      price REAL,
      categoria TEXT
    )
  `);

  // Ventas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ventas (
      id SERIAL PRIMARY KEY,
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

  // Pedidos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
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

  // Logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      timestamp TEXT
    )
  `);

  // Reservas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      nombre TEXT,
      detalle TEXT,
      fecha_reserva TEXT,
      estado TEXT DEFAULT 'pendiente',
      fecha_confirmacion TEXT,
      creado TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clientes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre TEXT,
      telefono TEXT UNIQUE,
      total_gastado REAL DEFAULT 0,
      cantidad_pedidos INTEGER DEFAULT 0,
      ultima_compra TEXT,
      items_frecuentes_json TEXT,
      creado_en TEXT
    )
  `);

  // Historial clientes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS historial_clientes (
      id SERIAL PRIMARY KEY,
      telefono TEXT,
      nombre_cliente TEXT,
      total REAL,
      items_json TEXT,
      fecha TEXT,
      admin TEXT,
      tipo TEXT
    )
  `);

  // Estado logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS estado_logs (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER,
      estado TEXT,
      admin TEXT,
      comentario TEXT,
      fecha TEXT
    )
  `);

  // Reservas detalle
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas_detalle (
      id SERIAL PRIMARY KEY,
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

  // Reservas productos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas_productos (
      id SERIAL PRIMARY KEY,
      reserva_id INTEGER,
      producto TEXT,
      cantidad INTEGER
    )
  `);

  // Reservas presupuestos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas_presupuestos (
      id SERIAL PRIMARY KEY,
      reserva_id INTEGER,
      presupuesto_json TEXT,
      envio REAL,
      total REAL,
      fecha TEXT,
      estado TEXT DEFAULT 'presupuestado'
    )
  `);

  // Reservas logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas_logs (
      id SERIAL PRIMARY KEY,
      reserva_id INTEGER,
      estado TEXT,
      admin TEXT,
      comentario TEXT,
      fecha TEXT
    )
  `);

  console.log("✅ Esquema PostgreSQL listo.");
}

initSchema().catch((err) => {
  console.error("❌ Error inicializando esquema:", err);
});

module.exports = db;
