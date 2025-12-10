const express = require("express");
const router = express.Router();
const { query } = require("../db");
const { verifyToken } = require("./auth");
const logAction = require("../utils/log");

// ==================================================
// GET /products → con filtros por categoría o búsqueda
// ==================================================
router.get("/", async (req, res) => {
  try {
    const categoria = req.query.categoria || null;
    const buscar = req.query.buscar || null;

    // FILTRO POR CATEGORÍA
    if (categoria) {
      const result = await query(
        "SELECT * FROM products WHERE category = $1 ORDER BY id DESC",
        [categoria]
      );
      return res.json(result.rows);
    }

    // FILTRO POR BUSCAR
    if (buscar) {
      const like = `%${buscar}%`;
      const result = await query(
        `
        SELECT * FROM products 
        WHERE name ILIKE $1 OR description ILIKE $1
        ORDER BY id DESC
        `,
        [like]
      );
      return res.json(result.rows);
    }

    // SIN FILTROS
    const all = await query("SELECT * FROM products ORDER BY id DESC");
    return res.json(all.rows);
  } catch (err) {
    console.error("Error obteniendo productos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ==================================================
// GET /products/:id
// ==================================================
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM products WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error obteniendo producto:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ==================================================
// CREAR PRODUCTO
// ==================================================
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, price, image, description, category, stock, stock_alert } =
      req.body;

    const result = await query(
      `
      INSERT INTO products 
      (name, price, image, description, category, stock, stock_alert)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [name, price, image, description, category, stock, stock_alert || 2]
    );

    const newId = result.rows[0].id;

    logAction(
      req.user,
      "PRODUCT_CREATE",
      `Creó producto "${name}" (id ${newId}), stock inicial: ${stock}`
    );

    res.json({ id: newId });
  } catch (err) {
    console.error("Error creando producto:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// ==================================================
// ACTUALIZAR PRODUCTO
// ==================================================
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { name, price, image, description, category, stock, stock_alert } =
      req.body;
    const id = req.params.id;

    await query(
      `
      UPDATE products SET
        name=$1, price=$2, image=$3, description=$4,
        category=$5, stock=$6, stock_alert=$7
      WHERE id=$8
      `,
      [name, price, image, description, category, stock, stock_alert, id]
    );

    logAction(
      req.user,
      "PRODUCT_UPDATE",
      `Editó producto "${name}" (id ${id}), nuevo stock: ${stock}`
    );

    res.json({ message: "Actualizado" });
  } catch (err) {
    console.error("Error actualizando producto:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ==================================================
// VENDER UNA UNIDAD
// ==================================================
router.post("/sell/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {
    // Obtener producto
    const productRes = await query("SELECT * FROM products WHERE id=$1", [id]);

    if (productRes.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });

    const p = productRes.rows[0];
    const nuevoStock = (p.stock || 0) - 1;

    if (nuevoStock < 0)
      return res.status(400).json({ error: "Sin stock" });

    // Actualizar stock
    await query("UPDATE products SET stock=$1 WHERE id=$2", [
      nuevoStock,
      id,
    ]);

    // Registrar venta
    const fecha = new Date().toISOString().split("T")[0];
    const cantidad = 1;
    const total = p.price * cantidad;

    await query(
      `
      INSERT INTO ventas 
      (producto_id, producto_nombre, cantidad, precio_unitario, precio_total, fecha)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [p.id, p.name, cantidad, p.price, total, fecha]
    );

    // Alertas
    let alerta = null;
    if (nuevoStock === 0) alerta = "SIN STOCK";
    else if (nuevoStock <= p.stock_alert) alerta = "STOCK BAJO";

    logAction(
      req.user,
      "PRODUCT_SELL",
      `Vendió 1 x "${p.name}" (id ${p.id}), stock nuevo: ${nuevoStock}, total: $${total}`
    );

    res.json({ stock: nuevoStock, alerta });
  } catch (err) {
    console.error("Error vendiendo producto:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ==================================================
// ELIMINAR PRODUCTO
// ==================================================
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    await query("DELETE FROM products WHERE id=$1", [id]);

    logAction(req.user, "PRODUCT_DELETE", `Eliminó producto id ${id}`);

    res.json({ message: "Eliminado" });
  } catch (err) {
    console.error("Error eliminando producto:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
