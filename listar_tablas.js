const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./palacio.db");

console.log("📋 Listando tablas...");

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) return console.error(err);

  console.log("📌 Tablas encontradas:");
  console.log(rows);
});
