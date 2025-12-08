// C:\El palacio del sándwich\server\routes\reservas.js

const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");
const ExcelJS = require("exceljs");

// ======================================================
// LISTA DE PRODUCTOS (para el formulario público)
// ======================================================
router.get("/productos", (req, res) => {
  db.all("SELECT id, name FROM products ORDER BY name ASC", (err, rows) => {
    if (err) {
      console.error("Error obteniendo productos:", err);
      return res.status(500).json({ error: "Error obteniendo productos" });
    }
    res.json(rows);
  });
});

// ======================================================
// CREAR RESERVA DESDE LA WEB PÚBLICA (sin login)
// ======================================================
router.post("/public", (req, res) => {
  const {
    nombre,
    apellido,
    telefono,
    codigo_postal,
    provincia,
    domicilio,
    ciudad,
    fecha_reserva,
    hora,
    tipo_evento,
    productos
  } = req.body || {};

  if (!nombre || !apellido || !telefono || !fecha_reserva || !hora) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const nombreCompleto = `${nombre} ${apellido}`.trim();
  const detalleTexto = tipo_evento || "";

  db.serialize(() => {
    // Cabecera en tabla reservas (existente)
    db.run(
      `
      INSERT INTO reservas (nombre, detalle, fecha_reserva, estado, fecha_confirmacion)
      VALUES (?, ?, ?, 'pendiente', NULL)
    `,
      [nombreCompleto, detalleTexto, fecha_reserva],
      function (err) {
        if (err) {
          console.error("Error creando reserva:", err);
          return res.status(500).json({ error: "No se pudo crear la reserva" });
        }

        const reservaId = this.lastID;

        // Detalle extendido
        db.run(
          `
          INSERT INTO reservas_detalle (
            reserva_id, nombre, apellido, telefono,
            codigo_postal, provincia, domicilio, ciudad,
            fecha_reserva, hora, tipo_evento
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            reservaId,
            nombre,
            apellido,
            telefono,
            codigo_postal || "",
            provincia || "",
            domicilio || "",
            ciudad || "",
            fecha_reserva,
            hora,
            tipo_evento || ""
          ],
          function (err2) {
            if (err2) {
              console.error("Error guardando detalle:", err2);
              return res
                .status(500)
                .json({ error: "No se pudo guardar el detalle de la reserva" });
            }

            // Productos
            if (!productos || !Array.isArray(productos) || productos.length === 0) {
              return res.json({ success: true, reserva_id: reservaId });
            }

            const stmt = db.prepare(
              "INSERT INTO reservas_productos (reserva_id, producto, cantidad) VALUES (?, ?, ?)"
            );

            productos.forEach(p => {
              if (p && p.producto) {
                stmt.run(reservaId, p.producto, parseInt(p.cantidad) || 0);
              }
            });

            stmt.finalize(err3 => {
              if (err3) {
                console.error("Error guardando productos:", err3);
                return res.status(500).json({
                  error: "No se pudieron guardar los productos"
                });
              }

              res.json({ success: true, reserva_id: reservaId });
            });
          }
        );
      }
    );
  });
});

// ======================================================
// LISTAR RESERVAS (admin)
// ======================================================
router.get("/", verifyToken, (req, res) => {
  const sql = `
    SELECT
      r.id,
      COALESCE(rd.nombre, r.nombre) AS nombre,
      rd.apellido,
      rd.telefono,
      COALESCE(rd.fecha_reserva, r.fecha_reserva) AS fecha_reserva,
      rd.hora,
      rd.tipo_evento,
      r.estado
    FROM reservas r
    LEFT JOIN reservas_detalle rd ON rd.reserva_id = r.id
    ORDER BY fecha_reserva ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error obteniendo reservas:", err);
      return res.status(500).json({ error: "Error obteniendo reservas" });
    }
    res.json(rows);
  });
});

// ======================================================
// EXPORTAR A EXCEL (MES / AÑO) - 3 HOJAS
// ======================================================
router.get("/exportar/:anio/:mes", verifyToken, (req, res) => {
  const anio = parseInt(req.params.anio, 10);
  const mes = parseInt(req.params.mes, 10);

  if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "Parámetros de fecha inválidos" });
  }

  const mesStr = String(mes).padStart(2, "0");
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const inicio = `${anio}-${mesStr}-01`;
  const fin = `${anio}-${mesStr}-${String(ultimoDia).padStart(2, "0")}`;

  const sqlReservas = `
    SELECT
      r.id,
      r.estado,
      rd.nombre,
      rd.apellido,
      rd.telefono,
      rd.codigo_postal,
      rd.provincia,
      rd.domicilio,
      rd.ciudad,
      rd.fecha_reserva,
      rd.hora,
      rd.tipo_evento
    FROM reservas r
    LEFT JOIN reservas_detalle rd ON rd.reserva_id = r.id
    WHERE rd.fecha_reserva BETWEEN ? AND ?
    ORDER BY rd.fecha_reserva ASC, rd.hora ASC
  `;

  db.all(sqlReservas, [inicio, fin], (err, reservasRows) => {
    if (err) {
      console.error("Error obteniendo reservas para Excel:", err);
      return res.status(500).json({ error: "Error obteniendo reservas" });
    }

    const ids = reservasRows.map(r => r.id);

    // Función para obtener productos
    const obtenerProductos = cb => {
      if (!ids.length) return cb(null, []);
      const placeholders = ids.map(() => "?").join(",");
      const sql = `
        SELECT reserva_id, producto, cantidad
        FROM reservas_productos
        WHERE reserva_id IN (${placeholders})
        ORDER BY reserva_id ASC
      `;
      db.all(sql, ids, (err2, rows2) => cb(err2, rows2 || []));
    };

    // Función para obtener presupuestos
    const obtenerPresupuestos = cb => {
      if (!ids.length) return cb(null, []);
      const placeholders = ids.map(() => "?").join(",");
      const sql = `
        SELECT reserva_id, presupuesto_json, envio, total, fecha
        FROM reservas_presupuestos
        WHERE reserva_id IN (${placeholders})
        ORDER BY fecha ASC
      `;
      db.all(sql, ids, (err3, rows3) => cb(err3, rows3 || []));
    };

    obtenerProductos((errProd, productosRows) => {
      if (errProd) {
        console.error("Error obteniendo productos para Excel:", errProd);
        return res.status(500).json({ error: "Error obteniendo productos" });
      }

      obtenerPresupuestos((errPres, presupuestosRows) => {
        if (errPres) {
          console.error("Error obteniendo presupuestos para Excel:", errPres);
          return res.status(500).json({ error: "Error obteniendo presupuestos" });
        }

        // Crear workbook
        const workbook = new ExcelJS.Workbook();

        // HOJA 1: RESERVAS
        const hoja1 = workbook.addWorksheet("Reservas");
        hoja1.columns = [
          { header: "ID Reserva", key: "id", width: 10 },
          { header: "Fecha", key: "fecha_reserva", width: 12 },
          { header: "Hora", key: "hora", width: 10 },
          { header: "Nombre", key: "nombre", width: 20 },
          { header: "Apellido", key: "apellido", width: 20 },
          { header: "Teléfono", key: "telefono", width: 18 },
          { header: "Código Postal", key: "codigo_postal", width: 12 },
          { header: "Provincia", key: "provincia", width: 18 },
          { header: "Ciudad", key: "ciudad", width: 18 },
          { header: "Domicilio", key: "domicilio", width: 30 },
          { header: "Evento", key: "tipo_evento", width: 25 },
          { header: "Estado", key: "estado", width: 15 }
        ];

        reservasRows.forEach(r => {
          hoja1.addRow({
            id: r.id,
            fecha_reserva: r.fecha_reserva || "",
            hora: r.hora || "",
            nombre: r.nombre || "",
            apellido: r.apellido || "",
            telefono: r.telefono || "",
            codigo_postal: r.codigo_postal || "",
            provincia: r.provincia || "",
            ciudad: r.ciudad || "",
            domicilio: r.domicilio || "",
            tipo_evento: r.tipo_evento || "",
            estado: r.estado || ""
          });
        });

        // HOJA 2: PRODUCTOS
        const hoja2 = workbook.addWorksheet("Productos");
        hoja2.columns = [
          { header: "ID Reserva", key: "reserva_id", width: 10 },
          { header: "Producto", key: "producto", width: 30 },
          { header: "Cantidad", key: "cantidad", width: 10 }
        ];

        productosRows.forEach(p => {
          hoja2.addRow({
            reserva_id: p.reserva_id,
            producto: p.producto,
            cantidad: p.cantidad
          });
        });

        // HOJA 3: PRESUPUESTOS
        const hoja3 = workbook.addWorksheet("Presupuestos");
        hoja3.columns = [
          { header: "ID Reserva", key: "reserva_id", width: 10 },
          { header: "Fecha presupuesto", key: "fecha", width: 22 },
          { header: "Producto", key: "producto", width: 30 },
          { header: "Cantidad", key: "cantidad", width: 10 },
          { header: "Precio unitario", key: "precio", width: 15 },
          { header: "Subtotal", key: "subtotal", width: 15 },
          { header: "Envío", key: "envio", width: 12 },
          { header: "Total", key: "total", width: 15 }
        ];

        presupuestosRows.forEach(p => {
          let items = [];
          try {
            items = JSON.parse(p.presupuesto_json || "[]");
          } catch (e) {
            items = [];
          }

          items.forEach(item => {
            hoja3.addRow({
              reserva_id: p.reserva_id,
              fecha: p.fecha || "",
              producto: item.producto || "",
              cantidad: item.cantidad || 0,
              precio: item.precio || 0,
              subtotal: item.subtotal || 0,
              envio: p.envio || 0,
              total: p.total || 0
            });
          });
        });

        // Nombre de archivo: El Palacio del Sándwich MES AÑO.xlsx
        const NOMBRES_MESES = [
          "Enero","Febrero","Marzo","Abril","Mayo","Junio",
          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
        ];
        const nombreMes = NOMBRES_MESES[mes - 1] || `${mes}`;
        const fileName = `El Palacio del Sándwich ${nombreMes} ${anio}`;

        workbook.xlsx.writeBuffer()
          .then(buffer => {
            res.setHeader(
              "Content-Type",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${fileName}.xlsx"`
            );
            res.send(buffer);
          })
          .catch(e => {
            console.error("Error generando Excel:", e);
            res.status(500).json({ error: "Error generando Excel" });
          });
      });
    });
  });
});

// ======================================================
// OBTENER RESERVA COMPLETA (detalle + productos)
// ======================================================
router.get("/:id", verifyToken, (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT
      r.id,
      r.estado,
      rd.nombre,
      rd.apellido,
      rd.telefono,
      rd.codigo_postal,
      rd.provincia,
      rd.domicilio,
      rd.ciudad,
      rd.fecha_reserva,
      rd.hora,
      rd.tipo_evento
    FROM reservas r
    LEFT JOIN reservas_detalle rd ON rd.reserva_id = r.id
    WHERE r.id = ?
  `;

  db.get(sql, [id], (err, reserva) => {
    if (err) {
      console.error("Error obteniendo reserva:", err);
      return res.status(500).json({ error: "Error obteniendo reserva" });
    }
    if (!reserva) return res.status(404).json({ error: "Reserva no encontrada" });

    db.all(
      "SELECT producto, cantidad FROM reservas_productos WHERE reserva_id = ?",
      [id],
      (err2, productos) => {
        if (err2) {
          console.error("Error obteniendo productos:", err2);
          return res.status(500).json({
            error: "Error obteniendo productos de la reserva"
          });
        }

        reserva.productos = productos || [];
        res.json(reserva);
      }
    );
  });
});

// ======================================================
// CAMBIAR ESTADO (pendiente / presupuestado / confirmado)
// ======================================================
router.put("/:id/estado", verifyToken, (req, res) => {
  const id = req.params.id;
  const { estado, comentario } = req.body || {};
  const nuevoEstado = estado || "pendiente";
  const adminName = req.user?.user || req.user?.username || "admin";
  const fecha = new Date().toISOString();

  db.serialize(() => {
    db.run(
      "UPDATE reservas SET estado = ? WHERE id = ?",
      [nuevoEstado, id],
      err => {
        if (err) {
          console.error("Error actualizando estado:", err);
          return res.status(500).json({ error: "No se pudo actualizar el estado" });
        }

        db.run(
          `
          INSERT INTO reservas_logs (reserva_id, estado, admin, comentario, fecha)
          VALUES (?, ?, ?, ?, ?)
        `,
          [id, nuevoEstado, adminName, comentario || "", fecha],
          err2 => {
            if (err2) console.error("Error guardando log:", err2);
            res.json({ success: true });
          }
        );
      }
    );
  });
});

// ======================================================
// GUARDAR PRESUPUESTO
// ======================================================
router.post("/:id/presupuesto", verifyToken, (req, res) => {
  const reserva_id = req.params.id;
  const { presupuesto, envio, total } = req.body;

  if (!presupuesto || !Array.isArray(presupuesto)) {
    return res.status(400).json({ error: "Presupuesto inválido" });
  }

  const fecha = new Date().toISOString();

  db.run(
    `
    INSERT INTO reservas_presupuestos (reserva_id, presupuesto_json, envio, total, fecha, estado)
    VALUES (?, ?, ?, ?, ?, 'presupuestado')
  `,
    [
      reserva_id,
      JSON.stringify(presupuesto),
      envio || 0,
      total || 0,
      fecha
    ],
    function (err) {
      if (err) {
        console.error("Error guardando presupuesto:", err);
        return res.status(500).json({ error: "Error guardando presupuesto" });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// ======================================================
// HISTORIAL DE PRESUPUESTOS
// ======================================================
router.get("/:id/presupuestos", verifyToken, (req, res) => {
  const reserva_id = req.params.id;

  db.all(
    `
      SELECT id, presupuesto_json, envio, total, fecha, estado
      FROM reservas_presupuestos
      WHERE reserva_id = ?
      ORDER BY fecha DESC
    `,
    [reserva_id],
    (err, rows) => {
      if (err) {
        console.error("Error obteniendo historial:", err);
        return res.status(500).json({ error: "Error obteniendo historial" });
      }

      rows = rows.map(r => ({
        ...r,
        presupuesto_json: JSON.parse(r.presupuesto_json || "[]")
      }));

      res.json(rows);
    }
  );
});

// ======================================================
// ELIMINAR RESERVA
// ======================================================
router.delete("/:id", verifyToken, (req, res) => {
  const id = req.params.id;

  db.serialize(() => {
    db.run("DELETE FROM reservas_productos WHERE reserva_id = ?", [id]);
    db.run("DELETE FROM reservas_detalle WHERE reserva_id = ?", [id]);
    db.run("DELETE FROM reservas_presupuestos WHERE reserva_id = ?", [id]);

    db.run("DELETE FROM reservas WHERE id = ?", [id], err => {
      if (err) {
        console.error("Error eliminando reserva:", err);
        return res.status(500).json({ error: "No se pudo eliminar" });
      }

      res.json({ success: true });
    });
  });
});

module.exports = router;
