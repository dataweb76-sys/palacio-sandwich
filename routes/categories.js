// ===============================================
// routes/categories.js
// ===============================================
const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");

// ===============================================
// OBTENER TODAS LAS CATEGORÍAS
// ===============================================
router.get("/", (req, res) => {
  db.all("SELECT * FROM categories ORDER BY orden ASC, id ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Error obteniendo categorías" });
    res.json(rows);
  });
});

// ===============================================
// OBTENER CATEGORÍA POR ID
// ===============================================
router.get("/:id", (req, res) => {
  db.get(
    "SELECT * FROM categories WHERE id=?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Error obteniendo categoría" });
      res.json(row);
    }
  );
});

// ===============================================
// CREAR NUEVA CATEGORÍA
// ===============================================
router.post("/", verifyToken, (req, res) => {
  const { nombre, tipo, image } = req.body;

  if (!nombre)
    return res.status(400).json({ error: "El nombre es obligatorio" });

  db.run(
    `
    INSERT INTO categories (nombre, tipo, image)
    VALUES (?, ?, ?)
  `,
    [nombre, tipo || "producto", image || null],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "No se pudo crear categoría" });
      }

      res.json({
        message: "Categoría creada correctamente",
        id: this.lastID,
      });
    }
  );
});

// ===============================================
// EDITAR CATEGORÍA
// ===============================================
router.put("/:id", verifyToken, (req, res) => {
  const { nombre, tipo, image } = req.body;

  db.run(
    `
    UPDATE categories 
    SET nombre=?, tipo=?, image=COALESCE(?, image)
    WHERE id=?
  `,
    [nombre, tipo, image || null, req.params.id],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "No se pudo editar categoría" });
      }

      res.json({ message: "Categoría actualizada" });
    }
  );
});

// ===============================================
// ELIMINAR CATEGORÍA
// ===============================================
router.delete("/:id", verifyToken, (req, res) => {
  db.run(
    "DELETE FROM categories WHERE id=?",
    [req.params.id],
    function (err) {
      if (err)
        return res.status(500).json({ error: "No se pudo eliminar categoría" });

      res.json({ message: "Categoría eliminada" });
    }
  );
});

module.exports = router;
