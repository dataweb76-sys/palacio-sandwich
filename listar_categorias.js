const db = require("./database");

db.all("SELECT id, nombre, tipo, image FROM categories", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("\n=== CATEGORÍAS EN LA BASE DE DATOS ===\n");
  console.table(rows);
});
