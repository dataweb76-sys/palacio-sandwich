// fix_pedidos.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./palacio.db");

console.log("🚀 Reparando tabla 'pedidos'...");

db.serialize(() => {
  db.run("BEGIN TRANSACTION");

  // 1. Crear nueva tabla completa
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos_nueva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT,
      items_json TEXT,
      total REAL,
      forma_pago TEXT,
      pagado INTEGER DEFAULT 0,
      fecha_hora TEXT,

      -- ✔ campos nuevos
      direccion TEXT,
      envio REAL,
      telefono TEXT,
      hora_entrega TEXT,
      tipo TEXT,
      comprobanteQR TEXT
    );
  `);

  // 2. Copiar datos antiguos SIN perder nada
  db.run(`
    INSERT INTO pedidos_nueva (
      id, nombre_cliente, items_json, total, forma_pago, pagado, fecha_hora
    )
    SELECT id, nombre_cliente, items_json, total, forma_pago, pagado, fecha_hora
    FROM pedidos;
  `);

  // 3. Borrar tabla vieja
  db.run("DROP TABLE pedidos");

  // 4. Renombrar la nueva
  db.run("ALTER TABLE pedidos_nueva RENAME TO pedidos");

  db.run("COMMIT");

  console.log("✅ Tabla 'pedidos' reparada y actualizada correctamente.");
});
