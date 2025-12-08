// migracion_agregar_imagen_categoria.js
// Ejecutar UNA sola vez para agregar columna "imagen" a categories

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath);

console.log("🔄 Ejecutando migración para agregar columna 'imagen'...");

db.serialize(() => {
  db.run(
    `ALTER TABLE categories ADD COLUMN imagen TEXT DEFAULT NULL;`,
    (err) => {
      if (err) {
        if (err.message.includes("duplicate column")) {
          console.log("✔ La columna 'imagen' ya existe. No se realizaron cambios.");
        } else {
          console.error("❌ Error ejecutando migración:", err.message);
        }
      } else {
        console.log("✅ Columna 'imagen' agregada exitosamente.");
      }

      db.close(() => console.log("📁 Conexión cerrada."));
    }
  );
});
