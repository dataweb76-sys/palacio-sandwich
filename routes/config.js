// routes/config.js
const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");

// ======================================
// GET: Obtener config (ES PUBLICO)
// ======================================
router.get("/", (req, res) => {
  db.get("SELECT envio_fijo, envio_gratis_desde FROM config LIMIT 1", [], (err, row) => {
    if (err) {
      console.error("Error leyendo config:", err);
      return res.json({
        envio_fijo: 0,
        envio_gratis_desde: 999999
      });
    }

    if (!row) {
      return res.json({
        envio_fijo: 0,
        envio_gratis_desde: 999999
      });
    }

    res.json(row);
  });
});

// ======================================
// PUT: Guardar config (ADMIN)
// ======================================
router.put("/", verifyToken, (req, res) => {
  const { envio_fijo, envio_gratis_desde } = req.body;

  if (envio_fijo == null || envio_gratis_desde == null) {
    return res.status(400).json({ error: "Faltan valores" });
  }

  const sql = `
    UPDATE config
    SET envio_fijo = ?, envio_gratis_desde = ?
  `;

  db.run(sql, [envio_fijo, envio_gratis_desde], function (err) {
    if (err) {
      console.error("Error guardando config:", err);
      return res.status(500).json({ error: "No se pudo guardar configuración" });
    }

    return res.json({ ok: true });
  });
});

module.exports = router;
