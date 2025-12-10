// app.js
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// ARCHIVOS ESTÁTICOS
// ===============================
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// IMPORTAR RUTAS
// ===============================
const authRouter = require("./routes/auth");
const productsRouter = require("./routes/products");
const promosRouter = require("./routes/promos");
const uploadRouter = require("./routes/upload");
const ventasRouter = require("./routes/ventas");
const configRouter = require("./routes/config");
const categoriesRouter = require("./routes/categories");
const categoriesPromosRouter = require("./routes/categories_promos");
const adminsRouter = require("./routes/admins");
const logsRouter = require("./routes/logs");
const pedidosRouter = require("./routes/pedidos");
const pedidosEstadoRouter = require("./routes/pedidos_estado");
const reservasRouter = require("./routes/reservas");
const enviosCalcRouter = require("./routes/envios_calc");
const clientesRouter = require("./routes/clientes");

// ===============================
// USAR RUTAS API
// ===============================
app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/promos", promosRouter);
app.use("/upload", uploadRouter);
app.use("/ventas", ventasRouter);
app.use("/config", configRouter);
app.use("/categories", categoriesRouter);
app.use("/categories_promos", categoriesPromosRouter);
app.use("/admins", adminsRouter);
app.use("/logs", logsRouter);
app.use("/pedidos", pedidosRouter);
app.use("/pedidos_estado", pedidosEstadoRouter);
app.use("/reservas", reservasRouter);
app.use("/api/calcular-envio", enviosCalcRouter);
app.use("/clientes", clientesRouter);

// ===============================
// FALLBACK SOLO PARA FRONTEND
// ===============================
app.get("*", (req, res) => {
  if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/auth"))
    return res.status(404).json({ error: "Ruta API inexistente" });

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// INICIAR SERVIDOR PARA RAILWAY
// ===============================
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Servidor corriendo en puerto ${PORT}`)
);
