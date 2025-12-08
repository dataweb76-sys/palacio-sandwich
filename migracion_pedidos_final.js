const db = require("./database");

function addColumn(name, type, callback) {
  db.get(`PRAGMA table_info(pedidos);`, (err, columns) => {
    if (err) return callback(err);

    db.all(`PRAGMA table_info(pedidos);`, (err, rows) => {
      if (err) return callback(err);

      const exists = rows.some(col => col.name === name);
      if (exists) {
        console.log(`✔ Columna '${name}' ya existe`);
        return callback();
      }

      db.run(`ALTER TABLE pedidos ADD COLUMN ${name} ${type};`, (err2) => {
        if (err2) return callback(err2);
        console.log(`➕ Columna '${name}' agregada`);
        callback();
      });
    });
  });
}

const columns = [
  ["tipo", "TEXT"],
  ["direccion", "TEXT"],
  ["telefono", "TEXT"],
  ["hora_entrega", "TEXT"],
  ["envio", "REAL"],
  ["distancia_km", "REAL"],
  ["comprobanteQR", "TEXT"],
  ["estado", "TEXT DEFAULT 'pendiente'"]
];

function processCols(i = 0) {
  if (i >= columns.length) {
    console.log("🎉 Migración finalizada");
    process.exit();
  }

  const [name, type] = columns[i];
  addColumn(name, type, () => processCols(i + 1));
}

processCols();
