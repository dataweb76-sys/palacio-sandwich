// routes/envios_calc.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// ===============================
// CARGAR CONFIG DE ENVÍOS
// ===============================
async function getConfig() {
  const configPath = path.join(__dirname, "..", "database", "config.json");

  if (!fs.existsSync(configPath)) {
    // Valores por defecto si aún no configuraste envíos
    return {
      envio_10: 0,          // costo fijo del envío
      envio_gratis_desde: 0 // sin envío gratis por defecto
    };
  }

  const raw = fs.readFileSync(configPath);
  return JSON.parse(raw);
}

// ===============================
// CALCULAR COSTO DE ENVÍO SIMPLE
// ===============================
router.post("/", async (req, res) => {
  try {
    const { total } = req.body;

    if (total == null) {
      return res.status(400).json({ error: "Falta el total del pedido" });
    }

    const totalNumber = Number(total || 0);
    const config = await getConfig();

    const costoFijo = Number(config.envio_10 || 0);
    const envioGratisDesde = Number(config.envio_gratis_desde || 0);

    let envio = 0;
    if (envioGratisDesde > 0 && totalNumber >= envioGratisDesde) {
      envio = 0;
    } else {
      envio = costoFijo;
    }

    const totalFinal = totalNumber + envio;

    res.json({
      envio,
      costo_envio: envio,
      total_final: totalFinal,
    });
  } catch (error) {
    console.error("Error calcular envío simple:", error);
    res.status(500).json({ error: "Error en cálculo de envío" });
  }
});

module.exports = router;
