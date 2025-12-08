const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.sqlite");

console.log("🛠 Migrando tabla pedidos...");

db.serialize(() => {
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

  console.log("✔ Tabla pedidos creada o actualizada correctamente.");
});

db.close();
