// ================================================
// SERVER.JS - El Palacio del Sándwich
// Ready para Render.com
// ================================================
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public folder
app.use(express.static(path.join(__dirname, "public")));

// Rutas
app.use("/categories", require("./routes/categories"));
app.use("/products", require("./routes/products"));
app.use("/promos", require("./routes/promos"));
app.use("/pedidos", require("./routes/pedidos"));
app.use("/reservas", require("./routes/reservas"));
app.use("/upload", require("./routes/upload"));
app.use("/auth", require("./routes/auth"));

// Servir frontend en caso de rutas inexistentes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// PORT Render
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));
