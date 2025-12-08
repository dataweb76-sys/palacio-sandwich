// add_distancia.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./palacio.db");

console.log("➕ Agregando columna distancia_km...");

db.run(
  `ALTER TABLE pedidos ADD COLUMN distancia_km REAL;`,
  (err) => {
    if (err) {
      console.error("❌ Error agregando columna:", err.message);
    } else {
      console.log("✅ Columna distancia_km agregada correctamente.");
    }
    db.close();
  }
);
