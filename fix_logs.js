// fix_logs.js
const db = require("./database");

db.run(`ALTER TABLE logs ADD COLUMN detalle TEXT`, (err) => {
  if (err) console.log("La columna ya existe o hubo un error:", err.message);
  else console.log("Columna 'detalle' agregada correctamente");
});

