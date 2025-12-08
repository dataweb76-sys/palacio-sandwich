// C:\El palacio del sándwich\server\routes\logs.js
const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");
const ExcelJS = require("exceljs");

// Middleware: solo SUPERADMIN
function onlySuper(req, res, next) {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Solo SUPERADMIN puede ver los logs" });
  }
  next();
}

// Helper para armar query según filtros
function buildLogsQuery(query) {
  const { from, to, user_id, action } = query;
  let sql = "SELECT * FROM logs WHERE 1=1";
  const params = [];

  if (from) {
    sql += " AND date(timestamp) >= date(?)";
    params.push(from);
  }
  if (to) {
    sql += " AND date(timestamp) <= date(?)";
    params.push(to);
  }
  if (user_id) {
    sql += " AND user_id = ?";
    params.push(user_id);
  }
  if (action) {
    sql += " AND action = ?";
    params.push(action);
  }

  sql += " ORDER BY timestamp DESC";

  return { sql, params };
}

// ===============================
// GET /logs  → lista filtrada
// ===============================
router.get("/", verifyToken, onlySuper, (req, res) => {
  const { sql, params } = buildLogsQuery(req.query);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Error obteniendo logs:", err);
      return res.status(500).json({ error: "Error obteniendo logs" });
    }
    res.json(rows);
  });
});

// ===============================
// GET /logs/export/excel → Excel
// ===============================
router.get("/export/excel", verifyToken, onlySuper, async (req, res) => {
  const { sql, params } = buildLogsQuery(req.query);

  db.all(sql, params, async (err, rows) => {
    if (err) {
      console.error("Error obteniendo logs para Excel:", err);
      return res.status(500).json({ error: "Error obteniendo logs" });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Logs");

      ws.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Usuario ID", key: "user_id", width: 10 },
        { header: "Usuario", key: "username", width: 20 },
        { header: "Acción", key: "action", width: 18 },
        { header: "Detalle", key: "detalle", width: 50 },
        { header: "Fecha/Hora", key: "timestamp", width: 22 },
      ];

      rows.forEach((r) => ws.addRow(r));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=logs_auditoria.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (e) {
      console.error("Error generando Excel de logs:", e);
      res.status(500).json({ error: "No se pudo generar el Excel" });
    }
  });
});

module.exports = router;
