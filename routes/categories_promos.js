const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");

// Obtener todas
router.get("/", verifyToken, (req, res) => {
  db.all("SELECT * FROM categories_promos ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error obteniendo categorías" });
    res.json(rows);
  });
});

// Obtener por id
router.get("/:id", verifyToken, (req, res) => {
  db.get("SELECT * FROM categories_promos WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Error obteniendo categoría" });
    res.json(row);
  });
});

// Lista simple para datalist
router.get("/names/list", (req, res) => {
  db.all("SELECT name FROM categories_promos ORDER BY name", [], (err, rows) => {
    if (err) return res.json([]);
    res.json(rows.map(r => r.name));
  });
});

// Crear
router.post("/", verifyToken, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Nombre obligatorio" });

  db.run(
    "INSERT INTO categories_promos (name, description) VALUES (?,?)",
    [name, description || ""],
    function (err) {
      if (err) return res.status(500).json({ error: "No se pudo crear" });
      res.json({ id: this.lastID });
    }
  );
});

// Editar
router.put("/:id", verifyToken, (req, res) => {
  const { name, description } = req.body;
  db.run(
    "UPDATE categories_promos SET name=?, description=? WHERE id=?",
    [name, description, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: "No se pudo actualizar" });
      res.json({ ok: true });
    }
  );
});

// Eliminar
router.delete("/:id", verifyToken, (req, res) => {
  db.run("DELETE FROM categories_promos WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: "No se pudo eliminar" });
    res.json({ ok: true });
  });
});

module.exports = router;
