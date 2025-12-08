const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");

// ======================================
// LISTAR CLIENTES  → GET /clientes
// ======================================
router.get("/", verifyToken, (req, res) => {
  db.all(
    `
      SELECT 
        id,
        nombre,
        telefono,
        total_gastado,
        cantidad_pedidos,
        ultima_compra,
        items_frecuentes_json
      FROM clientes
      ORDER BY total_gastado DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error obteniendo clientes:", err);
        return res.status(500).json([]);
      }

      // Normalizar por si hay nulls
      const data = rows.map(r => ({
        id: r.id,
        nombre: r.nombre || "Sin nombre",
        telefono: r.telefono || "",
        total_gastado: Number(r.total_gastado || 0),
        cantidad_pedidos: Number(r.cantidad_pedidos || 0),
        ultima_compra: r.ultima_compra || null,
        items_frecuentes_json: r.items_frecuentes_json || "[]"
      }));

      res.json(data);
    }
  );
});

// ======================================
// HISTORIAL DE UN CLIENTE
// GET /clientes/historial/:telefono
// ======================================
router.get("/historial/:tel", verifyToken, (req, res) => {
  const tel = req.params.tel;

  db.all(
    `
      SELECT 
        id,
        telefono,
        nombre_cliente,
        total,
        items_json,
        fecha,
        admin,
        tipo
      FROM historial_clientes
      WHERE telefono = ?
      ORDER BY fecha DESC
    `,
    [tel],
    (err, rows) => {
      if (err) {
        console.error("Error historial cliente:", err);
        return res.status(500).json([]);
      }
      res.json(rows);
    }
  );
});

// ======================================
// NOTAS DE CLIENTE
// GET /clientes/notas/:telefono
// POST /clientes/notas/:telefono
// ======================================

// GET /clientes/notas/:telefono
router.get("/notas/:tel", verifyToken, (req, res) => {
  const tel = req.params.tel;

  db.all(
    "SELECT * FROM notas_clientes WHERE telefono=? ORDER BY fecha DESC",
    [tel],
    (err, rows) => {
      if (err) {
        console.error("Error notas cliente:", err);
        return res.status(500).json([]);
      }
      res.json(rows);
    }
  );
});

// POST /clientes/notas/:telefono
router.post("/notas/:tel", verifyToken, (req, res) => {
  const tel = req.params.tel;
  const { nota } = req.body || {};
  const admin = req.user?.user || "admin";
  const fecha = new Date().toISOString();

  if (!nota || !nota.trim()) {
    return res.status(400).json({ error: "Nota vacía" });
  }

  db.run(
    `INSERT INTO notas_clientes (telefono, nota, admin, fecha)
     VALUES (?, ?, ?, ?)`,
    [tel, nota.trim(), admin, fecha],
    (err) => {
      if (err) {
        console.error("Error insertando nota:", err);
        return res.status(500).json({ error: true });
      }
      res.json({ ok: true });
    }
  );
});

module.exports = router;
