const db = require("./database");

db.all("SELECT id, name, category FROM products ORDER BY id", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("\n=== PRODUCTOS Y SUS CATEGORÍAS ===\n");
  console.table(rows);
});
