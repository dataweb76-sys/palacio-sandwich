// =========================================================
// PEDIDOS – VERSIÓN OPTIMIZADA PARA EL PALACIO DEL SÁNDWICH
// =========================================================

const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");

// ===============================
// FUNCIONES UTILITARIAS
// ===============================

// Sanitiza texto básico
const clean = (v) => (typeof v === "string" ? v.trim() : v);

// Ejecutar SQL con Promesa
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ===============================
// VALIDADORES
// ===============================

function validarItems(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

// Evita crashes y devuelve {"error": "..."}
function safeResponse(res, callback) {
  try {
    callback();
  } catch (e) {
    console.error("❌ Error interno:", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// =========================================================
// 1) PEDIDO SIMPLE / COMPATIBILIDAD
// =========================================================

router.post("/", (req, res) =>
  safeResponse(res, async () => {
    const { nombre_cliente, items, total, forma_pago, pagado } = req.body;

    if (!clean(nombre_cliente) || !validarItems(items) || total == null) {
      return res.status(400).json({ error: "Datos incompletos del pedido" });
    }

    const fecha_hora = new Date().toISOString();

    await runAsync(
      `INSERT INTO pedidos (
        nombre_cliente, telefono, direccion, hora_entrega,
        forma_pago, total, envio, distancia_km,
        items_json, comprobanteQR, tipo, estado, pagado, fecha_hora
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clean(nombre_cliente),
        "",
        "",
        "",
        forma_pago || "efectivo",
        total,
        0,
        0,
        JSON.stringify(items),
        null,
        "local",
        "pendiente",
        pagado ? 1 : 0,
        fecha_hora,
      ]
    );

    res.json({ ok: true });
  })
);

// =========================================================
// 2) PEDIDO LOCAL
// =========================================================

router.post("/local", (req, res) =>
  safeResponse(res, async () => {
    const { nombre, telefono, horaEntrega, carrito, total, formaPago } = req.body;

    if (!clean(nombre) || !validarItems(carrito)) {
      return res.status(400).json({ error: "Datos incompletos en pedido LOCAL" });
    }

    const fecha_hora = new Date().toISOString();

    const result = await runAsync(
      `INSERT INTO pedidos (
        nombre_cliente, telefono, direccion, hora_entrega,
        forma_pago, total, envio, distancia_km,
        items_json, comprobanteQR, tipo, estado, pagado, fecha_hora
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clean(nombre),
        clean(telefono || ""),
        "",
        clean(horaEntrega || ""),
        formaPago || "efectivo",
        total || 0,
        0,
        0,
        JSON.stringify(carrito),
        null,
        "local",
        "pendiente",
        0,
        fecha_hora,
      ]
    );

    res.json({ ok: true, id: result.lastID });
  })
);

// =========================================================
// 3) PEDIDO DELIVERY
// =========================================================

router.post("/delivery", (req, res) =>
  safeResponse(res, async () => {
    const {
      nombre,
      telefono,
      direccion,
      formaPago,
      envio,
      distanciaKm,
      totalFinal,
      carrito,
      comprobanteQR,
      horaEntrega,
    } = req.body;

    if (!clean(nombre) || !clean(telefono) || !clean(direccion) || !validarItems(carrito)) {
      return res.status(400).json({ error: "Datos incompletos para DELIVERY" });
    }

    const fecha_hora = new Date().toISOString();

    const result = await runAsync(
      `INSERT INTO pedidos (
        nombre_cliente, telefono, direccion, hora_entrega,
        forma_pago, total, envio, distancia_km,
        items_json, comprobanteQR, tipo, estado, pagado, fecha_hora
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clean(nombre),
        clean(telefono),
        clean(direccion),
        clean(horaEntrega || ""),
        formaPago || "efectivo",
        totalFinal || 0,
        envio || 0,
        distanciaKm || 0,
        JSON.stringify(carrito),
        comprobanteQR || null,
        "delivery",
        "pendiente",
        0,
        fecha_hora,
      ]
    );

    res.json({ ok: true, id: result.lastID });
  })
);

// =========================================================
// 4) LISTAR PEDIDOS
// =========================================================

router.get("/", verifyToken, (req, res) =>
  safeResponse(res, async () => {
    const rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM pedidos ORDER BY id DESC", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(rows);
  })
);
// ==========================================
// PEDIDOS POR HORA (HOY) – PARA ESTADÍSTICAS
// ==========================================
router.get("/por_hora", verifyToken, (req, res) => {
  const hoy = new Date().toISOString().substring(0, 10); // yyyy-mm-dd

  db.all(
    `
      SELECT 
        strftime('%H', fecha_hora) AS hora,
        COUNT(*) AS cantidad
      FROM pedidos
      WHERE fecha_hora LIKE ? || '%'
      GROUP BY strftime('%H', fecha_hora)
      ORDER BY hora ASC
    `,
    [hoy],
    (err, rows) => {
      if (err) {
        console.error("Error obteniendo pedidos por hora:", err);
        return res.status(500).json({ error: true });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
