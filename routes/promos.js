const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");
const logAction = require("../utils/log");

// ==================================================
// MIGRACIÓN SUAVE: asegurar columnas image, price, categoria
// ==================================================
db.all("PRAGMA table_info(promos)", (err, rows) => {
  if (err) {
    console.error("Error leyendo estructura de promos:", err);
    return;
  }
  if (!rows || rows.length === 0) {
    console.warn("Tabla 'promos' vacía o inexistente.");
    return;
  }

  const cols = rows.map(c => c.name);

  const ensureCol = (name, sql) => {
    if (!cols.includes(name)) {
      console.log(`Agregando columna '${name}' a promos...`);
      db.run(sql, (e) => {
        if (e) console.error(`Error agregando columna ${name}:`, e);
        else console.log(`Columna '${name}' agregada correctamente.`);
      });
    }
  };

  ensureCol("image", "ALTER TABLE promos ADD COLUMN image TEXT");
  ensureCol("price", "ALTER TABLE promos ADD COLUMN price REAL DEFAULT 0");
  ensureCol("categoria", "ALTER TABLE promos ADD COLUMN categoria TEXT");
});

// ==================================================
// OBTENER TODAS LAS PROMOS
// ==================================================
router.get("/", (req, res) => {
  db.all("SELECT * FROM promos ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("Error obteniendo promos:", err);
      return res.status(500).json({ error: "Error obteniendo promociones" });
    }
    res.json(rows);
  });
});

// ==================================================
// OBTENER PROMO POR ID
// ==================================================
router.get("/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM promos WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error obteniendo promo:", err);
      return res.status(500).json({ error: "Error obteniendo promoción" });
    }
    if (!row) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }
    res.json(row);
  });
});

// ==================================================
// CREAR PROMOCIÓN
// ==================================================
router.post("/", verifyToken, (req, res) => {
  const { title, description, image, price, categoria } = req.body;

  if (!title || price == null) {
    return res.status(400).json({ error: "Título y precio son obligatorios" });
  }

  db.run(
    `
    INSERT INTO promos (title, description, image, price, categoria)
    VALUES (?, ?, ?, ?, ?)
    `,
    [title, description || "", image || "", price, categoria || ""],
    function (err) {
      if (err) {
        console.error("Error creando promoción:", err);
        return res.status(500).json({ error: "No se pudo crear la promoción" });
      }

      logAction(req, `Creó promoción: ${title} (ID ${this.lastID})`);

      res.json({ id: this.lastID });
    }
  );
});

// ==================================================
// ACTUALIZAR PROMOCIÓN
// ==================================================
router.put("/:id", verifyToken, (req, res) => {
  const { title, description, image, price, categoria } = req.body;
  const id = req.params.id;

  if (!title || price == null) {
    return res.status(400).json({ error: "Título y precio son obligatorios" });
  }

  db.run(
    `
    UPDATE promos
    SET title=?, description=?, image=?, price=?, categoria=?
    WHERE id=?
    `,
    [title, description || "", image || "", price, categoria || "", id],
    function (err) {
      if (err) {
        console.error("Error actualizando promoción:", err);
        return res.status(500).json({ error: "No se pudo actualizar la promoción" });
      }

      logAction(req, `Editó promoción ID ${id}`);

      res.json({ ok: true });
    }
  );
});

// ==================================================
// ELIMINAR PROMOCIÓN
// ==================================================
router.delete("/:id", verifyToken, (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM promos WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error eliminando promoción:", err);
      return res.status(500).json({ error: "No se pudo eliminar la promoción" });
    }

    logAction(req, `Eliminó promoción ID ${id}`);

    res.json({ ok: true });
  });
});

module.exports = router;
