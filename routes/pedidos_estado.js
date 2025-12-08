// =======================================
// PEDIDOS ESTADO (cambiar estado + tracking + CRM + LOGS CON COMENTARIO)
// =======================================

const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");

// =======================================
// SSE TRACKING PARA CLIENTES
// =======================================
const clientesTracking = {};

router.get("/tracking/:id", (req, res) => {
  const id = req.params.id;

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  res.flushHeaders();

  clientesTracking[id] = res;

  req.on("close", () => {
    delete clientesTracking[id];
  });
});

function enviarTracking(id, data) {
  if (clientesTracking[id]) {
    clientesTracking[id].write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// =======================================
// LOG DE ESTADOS CON COMENTARIO
// =======================================
function guardarEstadoLog(pedido_id, estado, admin, comentario = "") {
  const fecha = new Date().toISOString();

  db.run(
    `INSERT INTO estado_logs (pedido_id, estado, admin, comentario, fecha)
     VALUES (?, ?, ?, ?, ?)`,
    [pedido_id, estado, admin, comentario, fecha]
  );
}

// =======================================
// AUXILIAR CRM (igual que antes)
// =======================================
function mergeItems(oldJson, newJson) {
  try {
    const a = JSON.parse(oldJson || "[]");
    const b = JSON.parse(newJson || "[]");
    return JSON.stringify([...a, ...b]);
  } catch (e) {
    return newJson;
  }
}

function registrarClienteYHistorial(pedido, adminName = "admin") {
  const telefono = (pedido.telefono || "").trim();
  if (!telefono) return;

  const nombre = pedido.nombre_cliente || "";
  const total = pedido.total || 0;
  const items = pedido.items_json || "[]";
  const fecha = new Date().toISOString();

  // Historial
  db.run(
    `INSERT INTO historial_clientes (telefono, nombre_cliente, total, items_json, fecha, admin, tipo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [telefono, nombre, total, items, fecha, adminName, pedido.tipo || "local"]
  );

  // Cliente nuevo o existente
  db.get("SELECT * FROM clientes WHERE telefono=?", [telefono], (err, cli) => {
    if (!cli) {
      db.run(
        `INSERT INTO clientes (nombre, telefono, total_gastado, cantidad_pedidos, ultima_compra, items_frecuentes_json, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombre, telefono, total, 1, fecha, items, fecha]
      );
    } else {
      const nuevoTotal = (cli.total_gastado || 0) + total;
      const nuevaCantidad = (cli.cantidad_pedidos || 0) + 1;
      const nuevosItems = mergeItems(cli.items_frecuentes_json, items);

      db.run(
        `UPDATE clientes 
         SET nombre=?, total_gastado=?, cantidad_pedidos=?, ultima_compra=?, items_frecuentes_json=?
         WHERE telefono=?`,
        [nombre || cli.nombre, nuevoTotal, nuevaCantidad, fecha, nuevosItems, telefono]
      );
    }
  });
}

// =======================================
// FUNCIÓN INTERNA PARA CAMBIO DE ESTADO
// (evita repetir 4 veces el mismo código)
// =======================================
function cambiarEstado(pedido_id, nuevoEstado, admin, comentario, callback) {
  db.run("UPDATE pedidos SET estado=? WHERE id=?", [nuevoEstado, pedido_id], (err) => {
    if (err) return callback(err);

    enviarTracking(pedido_id, { estado: nuevoEstado });

    guardarEstadoLog(pedido_id, nuevoEstado, admin, comentario);

    callback(null);
  });
}

// =======================================
// RUTA: PREPARANDO
// =======================================
router.post("/preparando/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const comentario = req.body.comentario || "";
  const admin = req.user?.user || "admin";

  cambiarEstado(id, "preparando", admin, comentario, (err) => {
    if (err) return res.status(500).json({ error: "Error actualizando estado" });
    res.json({ ok: true });
  });
});

// =======================================
// RUTA: LISTO
// =======================================
router.post("/listo/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const comentario = req.body.comentario || "";
  const admin = req.user?.user || "admin";

  cambiarEstado(id, "listo", admin, comentario, (err) => {
    if (err) return res.status(500).json({ error: "Error actualizando estado" });
    res.json({ ok: true });
  });
});

// =======================================
// RUTA: EN CAMINO
// =======================================
router.post("/encamino/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const comentario = req.body.comentario || "";
  const admin = req.user?.user || "admin";

  cambiarEstado(id, "en_camino", admin, comentario, (err) => {
    if (err) return res.status(500).json({ error: "Error actualizando estado" });
    res.json({ ok: true });
  });
});

// =======================================
// RUTA: ENTREGADO
// =======================================
router.post("/entregado/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const comentario = req.body.comentario || "";
  const admin = req.user?.user || "admin";

  cambiarEstado(id, "entregado", admin, comentario, (err) => {
    if (err) return res.status(500).json({ error: "Error actualizando estado" });

    // Registrar cliente en CRM
    db.get("SELECT * FROM pedidos WHERE id=?", [id], (err, p) => {
      if (!err && p) registrarClienteYHistorial(p, admin);
    });

    res.json({ ok: true });
  });
});

// =======================================
// EXPORTAR
// =======================================
module.exports = router;
module.exports.enviarTracking = enviarTracking;
