const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./palacio.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );
  `);

  db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_costo','800')`);
  db.run(`INSERT OR IGNORE INTO config (clave, valor) VALUES ('envio_gratis_desde','5000')`);

  console.log("Tabla CONFIG creada correctamente");
});
