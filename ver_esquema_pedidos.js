const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// MISMA RUTA que en app.js y migracion.js
const db = new sqlite3.Database(
  path.join(__dirname, "palacio.db"),
  (err) => {
    if (err) {
      console.error("Error abriendo DB:", err);
      return;
    }
    console.log("DB abierta, mostrando esquema de 'pedidos'...\n");

    db.all("PRAGMA table_info(pedidos);", [], (err, rows) => {
      if (err) {
        console.error("Error leyendo esquema:", err);
      } else {
        console.table(rows);
      }
      db.close();
    });
  }
);
