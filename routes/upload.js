const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// ===============================
// CONFIGURACIÓN DE MULTER
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "public", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ===============================
// SUBIDA DE ARCHIVOS (SIN TOKEN)
// ===============================
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió archivo" });
  }

  // 🔥 Ruta correcta para que el navegador pueda mostrar la imagen
  res.json({
    url: "/uploads/" + req.file.filename
  });
});

module.exports = router;

