// C:\El palacio del sándwich\server\routes\ventas.js
const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");
const ExcelJS = require("exceljs");
const logAction = require("../utils/log");

// Todas las ventas (para admin/POS)
router.get("/", verifyToken, (req, res) => {
  db.all("SELECT * FROM ventas ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error obteniendo ventas" });
    }
    res.json(rows);
  });
});

// Ventas por día YYYY-MM-DD
router.get("/fecha/:dia", verifyToken, (req, res) => {
  db.all("SELECT * FROM ventas WHERE fecha=?", [req.params.dia], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error obteniendo ventas" });
    }
    res.json(rows);
  });
});

// Ventas por mes YYYY-MM
router.get("/mes/:mes", verifyToken, (req, res) => {
  db.all(
    "SELECT * FROM ventas WHERE fecha LIKE ?",
    [req.params.mes + "%"],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error obteniendo ventas" });
      }
      res.json(rows);
    }
  );
});

// Registrar venta de PROMO (no toca stock)
router.post("/promo", verifyToken, (req, res) => {
  const { nombre, cantidad, precio_unitario } = req.body;

  if (!nombre || !cantidad || !precio_unitario) {
    return res.status(400).json({ error: "Faltan datos de la promo" });
  }

  const precioTotal = cantidad * precio_unitario;
  const fecha = new Date().toISOString().split("T")[0];

  db.run(
    "INSERT INTO ventas (producto_id, producto_nombre, cantidad, precio_unitario, precio_total, fecha) VALUES (?,?,?,?,?,?)",
    [null, nombre, cantidad, precio_unitario, precioTotal, fecha],
    function (err) {
      if (err) {
        console.error("Error registrando venta de promo:", err);
        return res.status(500).json({ error: "No se pudo registrar la venta" });
      }

      // LOG: venta de promo
      logAction(
        req.user,
        "VENTA_PROMO",
        `Vendió promo "${nombre}" x${cantidad}, total: $${precioTotal}`
      );

      res.json({ id: this.lastID });
    }
  );
});

// ======================= EXPORTAR A EXCEL ==========================
router.get("/export/excel", verifyToken, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ventas");

    // Encabezados
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Producto", key: "producto_nombre", width: 30 },
      { header: "Cantidad", key: "cantidad", width: 10 },
      { header: "Precio Unitario", key: "precio_unitario", width: 15 },
      { header: "Precio Total", key: "precio_total", width: 15 },
      { header: "Fecha", key: "fecha", width: 15 },
    ];

    // Obtener todas las ventas
    db.all("SELECT * FROM ventas ORDER BY id ASC", [], async (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error obteniendo ventas" });
      }

      // Agregar filas al Excel
      rows.forEach((v) => worksheet.addRow(v));

      // Cabeceras de descarga
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=ventas.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    });
  } catch (error) {
    console.error("Error generando Excel:", error);
    res.status(500).json({ error: "No se pudo generar el Excel" });
  }
});

module.exports = router;

