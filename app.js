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
// ARCHIVOS ESTÁTICOS
// ===============================
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// USAR RUTAS
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
// INICIAR SERVIDOR
// ===============================
// 👇 IMPORTANTE PARA RAILWAY: usar process.env.PORT
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Servidor corriendo en puerto ${PORT}`)
);
