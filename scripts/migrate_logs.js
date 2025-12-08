// C:\El palacio del sándwich\server\scripts\migrate_logs.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./palacio.db");

db.serialize(() => {
  // Crear tabla si no existe
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      detalle TEXT,
      timestamp TEXT
    )
  `);

  // Asegurar columna 'detalle' por si tu tabla vieja no la tenía
  db.all("PRAGMA table_info(logs)", (err, rows) => {
    if (err) {
      console.error("Error leyendo schema logs:", err);
      return;
    }
    const cols = rows.map((c) => c.name);
    if (!cols.includes("detalle")) {
      db.run("ALTER TABLE logs ADD COLUMN detalle TEXT", (e) => {
        if (e) console.error("Error agregando columna detalle:", e);
        else console.log("Columna 'detalle' agregada a logs.");
      });
    } else {
      console.log("Columna 'detalle' ya existía.");
    }
  });
});

db.close();
