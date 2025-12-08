const express = require("express");
const router = express.Router();
const db = require("../database");
const { verifyToken } = require("./auth");
const logAction = require("../utils/log");

// ==================================================
// OBTENER PRODUCTOS (PÚBLICO) CON FILTRO POR CATEGORÍA
// GET /products?categoria=Algo
// GET /products?buscar=text
// ==================================================
router.get("/", (req, res) => {
  const categoria = req.query.categoria || null;
  const buscar = req.query.buscar || null;

  // ===============================
  // FILTRO POR CATEGORÍA
  // ===============================
  if (categoria) {
    db.all(
      "SELECT * FROM products WHERE category = ? ORDER BY id DESC",
      [categoria],
      (err, rows) => {
        if (err) {
          console.error("Error filtrando por categoría:", err);
          return res.status(500).json([]);
        }
        return res.json(rows);
      }
    );
    return;
  }

  // ===============================
  // FILTRO POR BÚSQUEDA (OPCIONAL)
  // ===============================
  if (buscar) {
    const like = `%${buscar}%`;
    db.all(
      `
      SELECT * FROM products 
      WHERE name LIKE ? OR description LIKE ? 
      ORDER BY id DESC
      `,
      [like, like],
      (err, rows) => {
        if (err) {
          console.error("Error filtrando por búsqueda:", err);
          return res.status(500).json([]);
        }
        return res.json(rows);
      }
    );
    return;
  }

  // ===============================
  // SIN FILTROS → todos los productos
  // ===============================
  db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("Error obteniendo productos:", err);
      return res.status(500).json({ error: "Error al obtener productos" });
    }
    res.json(rows);
  });
});

// ==================================================
// OBTENER UN PRODUCTO POR ID
// ==================================================
router.get("/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error obteniendo producto:", err);
      return res.status(500).json({ error: "Error interno" });
    }
    if (!row) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(row);
  });
});

// ==================================================
// CREAR PRODUCTO
// ==================================================
router.post("/", verifyToken, (req, res) => {
  const { name, price, image, description, category, stock, stock_alert } =
    req.body;

  db.run(
    `INSERT INTO products (
      name, price, image, description, category, stock, stock_alert
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, price, image, description, category, stock, stock_alert || 2],
    function (err) {
      if (err) {
        console.error("Error creando producto:", err);
        return res.status(500).json({ error: "Error al crear producto" });
      }

      logAction(
        req.user,
        "PRODUCT_CREATE",
        `Creó producto "${name}" (id ${this.lastID}), stock inicial: ${stock}`
      );

      res.json({ id: this.lastID });
    }
  );
});

// ==================================================
// ACTUALIZAR PRODUCTO
// ==================================================
router.put("/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const { name, price, image, description, category, stock, stock_alert } =
    req.body;

  db.run(
    `UPDATE products 
     SET name=?, price=?, image=?, description=?, category=?, stock=?, stock_alert=?
     WHERE id=?`,
    [name, price, image, description, category, stock, stock_alert, id],
    function (err) {
      if (err) {
        console.error("Error actualizando producto:", err);
        return res.status(500).json({ error: "Error al actualizar producto" });
      }

      logAction(
        req.user,
        "PRODUCT_UPDATE",
        `Editó producto "${name}" (id ${id}), nuevo stock: ${stock}`
      );

      res.json({ message: "Actualizado" });
    }
  );
});

// ==================================================
// VENDER UNA UNIDAD
// ==================================================
router.post("/sell/:id", verifyToken, (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM products WHERE id=?", [id], (err, p) => {
    if (err || !p) {
      console.error(err);
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const nuevoStock = (p.stock || 0) - 1;

    if (nuevoStock < 0) {
      return res.status(400).json({ error: "Sin stock" });
    }

    db.run("UPDATE products SET stock=? WHERE id=?", [nuevoStock, id]);

    const fecha = new Date().toISOString().split("T")[0];
    const cantidad = 1;
    const total = p.price * cantidad;

    db.run(
      `INSERT INTO ventas 
       (producto_id, producto_nombre, cantidad, precio_unitario, precio_total, fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, cantidad, p.price, total, fecha],
      (err2) => {
        if (err2) console.error("Error registrando venta:", err2);
      }
    );

    let alerta = null;
    if (nuevoStock === 0) alerta = "SIN STOCK";
    else if (nuevoStock <= p.stock_alert) alerta = "STOCK BAJO";

    logAction(
      req.user,
      "PRODUCT_SELL",
      `Vendió 1 x "${p.name}" (id ${p.id}), stock nuevo: ${nuevoStock}, total: $${total}`
    );

    res.json({ stock: nuevoStock, alerta });
  });
});

// ==================================================
// ELIMINAR PRODUCTO
// ==================================================
router.delete("/:id", verifyToken, (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM products WHERE id=?", [id], (err) => {
    if (err) {
      console.error("Error eliminando producto:", err);
      return res.status(500).json({ error: "Error al eliminar producto" });
    }

    logAction(req.user, "PRODUCT_DELETE", `Eliminó producto id ${id}`);
    res.json({ message: "Eliminado" });
  });
});

module.exports = router;
