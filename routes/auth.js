// C:\El palacio del sándwich\server\routes\auth.js
const express = require("express");
const router = express.Router();
const db = require("../database");
const jwt = require("jsonwebtoken");
const logAction = require("../utils/log");

const SECRET = "PalacioSandwichSecret2025";

// LOGIN
router.post("/login", (req, res) => {
  const { user, pass } = req.body;

  db.get(
    "SELECT * FROM admin WHERE user=? AND pass=?",
    [user, pass],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error interno" });
      }
      if (!row) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      const token = jwt.sign(
        { id: row.id, user: row.user, role: row.role || "admin" },
        SECRET,
        { expiresIn: "1d" }
      );

      // Log de login exitoso
      logAction(
        { id: row.id, user: row.user },
        "LOGIN",
        "Inicio de sesión correcto"
      );

      res.json({ token });
    }
  );
});

// Middleware de protección
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Token requerido" });

  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token inválido" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido" });
    req.user = decoded; // {id, user, role}
    next();
  });
}

// Cambio de contraseña
router.post("/change-password", verifyToken, (req, res) => {
  const { currentPass, newPass } = req.body;
  if (!currentPass || !newPass) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  db.get(
    "SELECT * FROM admin WHERE id=? AND pass=?",
    [req.user.id, currentPass],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error interno" });
      }
      if (!row) {
        return res
          .status(401)
          .json({ error: "Contraseña actual incorrecta" });
      }

      db.run(
        "UPDATE admin SET pass=? WHERE id=?",
        [newPass, req.user.id],
        (e) => {
          if (e) {
            console.error(e);
            return res
              .status(500)
              .json({ error: "No se pudo cambiar la contraseña" });
          }

          // Log de cambio de contraseña
          logAction(req.user, "CHANGE_PASSWORD", "Cambio de contraseña");

          res.json({ message: "Contraseña cambiada con éxito" });
        }
      );
    }
  );
});

module.exports = router;
module.exports.verifyToken = verifyToken;

