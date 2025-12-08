// migracion.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

console.log("Iniciando migraciones...");

// ----------------------------------------------------
// Crear tabla si NO existe
// ----------------------------------------------------
function crearTablaSiNoExiste(nombreTabla, definicion) {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS ${nombreTabla} (${definicion});`,
      [],
      (err) => {
        if (err) return reject(err);
        console.log(`✔ Tabla '${nombreTabla}' verificada/creada`);
        resolve();
      }
    );
  });
}

// ----------------------------------------------------
// Verificar si una columna existe
// ----------------------------------------------------
function columnaExiste(tabla, columna) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tabla});`, (err, rows) => {
      if (err) return reject(err);

      const existe = rows.some((r) => r.name === columna);
      resolve(existe);
    });
  });
}

// ----------------------------------------------------
// Agregar columna si falta
// ----------------------------------------------------
function agregarColumnaSiFalta(tabla, columna, tipo) {
  return new Promise(async (resolve, reject) => {
    const existe = await columnaExiste(tabla, columna);

    if (!existe) {
      console.log(`🟡 Agregando columna '${columna}' a '${tabla}'...`);
      db.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo};`, [], (err) => {
        if (err) return reject(err);
        console.log(`🟢 Columna '${columna}' agregada.`);
        resolve();
      });
    } else {
      console.log(`✔ Columna '${columna}' ya existe en '${tabla}'.`);
      resolve();
    }
  });
}

// ----------------------------------------------------
// Migraciones
// ----------------------------------------------------
async function migrar() {
  try {
    // =====================================================
    // 1) Crear tabla LOGS si no existe
    // =====================================================
    await crearTablaSiNoExiste(
      "logs",
      `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        mensaje TEXT,
        detalle TEXT,
        fecha TEXT
      `
    );

    // =====================================================
    // 2) Crear tabla PEDIDOS si no existe
    // =====================================================
    await crearTablaSiNoExiste(
      "pedidos",
      `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_cliente TEXT,
        total REAL,
        forma_pago TEXT,
        pagado INTEGER DEFAULT 0,
        fecha_hora TEXT,
        items_json TEXT,
        direccion TEXT,
        envio REAL,
        comprobanteQR TEXT,
        telefono TEXT,
        hora_entrega TEXT
      `
    );

    // =====================================================
    // 3) Migrar columnas faltantes de pedidos
    // =====================================================
    await agregarColumnaSiFalta("pedidos", "direccion", "TEXT");
    await agregarColumnaSiFalta("pedidos", "envio", "REAL");
    await agregarColumnaSiFalta("pedidos", "comprobanteQR", "TEXT");
    await agregarColumnaSiFalta("pedidos", "telefono", "TEXT");
    await agregarColumnaSiFalta("pedidos", "hora_entrega", "TEXT");

    console.log("\n🎉 Migraciones completadas con éxito.");
    db.close();
  } catch (err) {
    console.error("❌ Error en migraciones:", err);
    db.close();
  }
}

migrar();
