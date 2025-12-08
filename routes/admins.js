// C:\El palacio del sándwich\server\routes\admins.js
const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");
const logAction = require("../utils/log");

// Middleware: solo SUPERADMIN
function onlySuper(req, res, next) {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Solo el SUPERADMIN puede hacer esto" });
  }
  next();
}

// ===============================
// GET: Listar admins
// ===============================
router.get("/", verifyToken, onlySuper, (req, res) => {
  db.all("SELECT id, user, role FROM admin", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error" });
    res.json(rows);
  });
});

// ===============================
// POST: Crear admin nuevo
// ===============================
router.post("/", verifyToken, onlySuper, (req, res) => {
  const { user, pass, role } = req.body;

  if (!user || !pass)
    return res.status(400).json({ error: "Falta usuario y clave" });

  const finalRole = role === "superadmin" ? "admin" : role; 
  // Previene crear otro superadmin desde el front

  db.run(
    "INSERT INTO admin (user, pass, role) VALUES (?, ?, ?)",
    [user, pass, finalRole || "admin"],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Usuario ya existe?" });
      }

      // LOG: creación de admin
      logAction(
        req.user,
        "ADMIN_CREATE",
        `Creó admin "${user}" con rol "${finalRole || "admin"}"`
      );

      res.json({ message: "Admin creado", id: this.lastID });
    }
  );
});

// ===============================
// DELETE: Eliminar admin
// ===============================
router.delete("/:id", verifyToken, onlySuper, (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM admin WHERE id=?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Error eliminando" });

    if (this.changes === 0)
      return res.status(404).json({ error: "No existe ese admin" });

    // LOG: eliminación de admin
    logAction(
      req.user,
      "ADMIN_DELETE",
      `Eliminó admin con id ${id}`
    );

    res.json({ message: "Admin eliminado" });
  });
});

module.exports = router;
