// initDb.js — Migración completa desde SQLite a PostgreSQL
const pool = require("./database");

async function init() {
  try {
    console.log("🚀 Inicializando base de datos PostgreSQL...");

    // ================================
    // CONFIG
    // ================================
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
      ON CONFLICT (clave) DO NOTHING;
    `);

    // ================================
    // ADMIN
    // ================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        user TEXT UNIQUE,
        pass TEXT,
        role TEXT DEFAULT 'admin'
      )
    `);

    await pool.query(`
      INSERT INTO admin (user, pass, role)
      VALUES ('admin', 'admin123', 'superadmin')
      ON CONFLICT (user) DO NOTHING;
    `);

    // ================================
    // CATEGORIES
    // ================================
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

    // ================================
    // PRODUCTS
    // ================================
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

    // ================================
    // PROMOS
    // ================================
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

    // ================================
    // VENTAS
    // ================================
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

    // ================================
    // PEDIDOS
    // ================================
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

    // ================================
    // LOGS
    // ================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username TEXT,
        action TEXT,
        timestamp TEXT
      )
    `);

    // ================================
    // RESERVAS
    // ================================
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

    // ================================
    // CLIENTES
    // ================================
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

    // ================================
    // HISTORIAL CLIENTES
    // ================================
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

    // ================================
    // ESTADO LOGS
    // ================================
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

    // ================================
    // RESERVAS DETALLE
    // ================================
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

    // ================================
    // RESERVAS PRODUCTOS
    // ================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservas_productos (
        id SERIAL PRIMARY KEY,
        reserva_id INTEGER,
        producto TEXT,
        cantidad INTEGER
      )
    `);

    // ================================
    // RESERVAS PRESUPUESTOS
    // ================================
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

    // ================================
    // RESERVAS LOGS
    // ================================
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

    console.log("✅ Migración finalizada correctamente.");
  } catch (err) {
    console.error("❌ ERROR en migración:", err);
  } finally {
    pool.end();
  }
}

init();
