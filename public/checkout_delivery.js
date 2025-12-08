// =======================================
// CARRITO
// =======================================
let carrito = [];

try {
  carrito = JSON.parse(localStorage.getItem("cart") || "[]");
} catch (e) {
  carrito = [];
}

if (!carrito || !carrito.length) {
  window.location.href = "index.html";
}

let subtotalGlobal = 0;
let costoEnvio = 0;
let totalFinalGlobal = 0;

// =======================================
// RENDER DEL CARRITO
// =======================================
function renderCarritoResumen() {
  const cont = document.getElementById("resumenCarrito");
  cont.innerHTML = "";

  let subtotal = 0;

  carrito.forEach((item) => {
    const cantidad = item.cantidad || 1;
    const precio = Number(item.precio || 0);
    const sub = cantidad * precio;
    subtotal += sub;

    const fila = document.createElement("div");
    fila.className = "resumen-item";

    fila.innerHTML = `
      <span>${cantidad} × ${item.nombre}</span>
      <span>$${sub}</span>
    `;

    cont.appendChild(fila);
  });

  subtotalGlobal = subtotal;
  document.getElementById("subtotalTexto").textContent = `$${subtotal}`;

  actualizarTotales();
}

// =======================================
// COSTO DE ENVÍO
// =======================================
async function cargarCostoEnvio() {
  try {
    const res = await fetch("/config");
    const cfg = await res.json();

    const envioFijo = Number(cfg.envio_fijo || 0);
    const envioGratisDesde = Number(cfg.envio_gratis_desde || 999999);

    costoEnvio = subtotalGlobal >= envioGratisDesde ? 0 : envioFijo;

    actualizarTotales();
  } catch (e) {
    console.error("Error obteniendo envío:", e);
    costoEnvio = 0;
    actualizarTotales();
  }
}

// =======================================
// ACTUALIZAR TOTALES
// =======================================
function actualizarTotales() {
  totalFinalGlobal = subtotalGlobal + costoEnvio;

  document.getElementById("costoEnvio").textContent = `$${costoEnvio}`;
  document.getElementById("totalFinal").textContent = `$${totalFinalGlobal}`;
}

// =======================================
// FINALIZAR DELIVERY
// =======================================
async function finalizarDelivery() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const formaPago = document.getElementById("formaPago").value;
  const horaEntrega = document.getElementById("horaEntrega").value;

  if (!nombre || !telefono || !direccion) {
    alert("Completá nombre, teléfono y dirección.");
    return;
  }

  if (!horaEntrega) {
    alert("Seleccioná la hora deseada de entrega.");
    return;
  }

  let comprobanteUrl = null;

  if (formaPago === "qr") {
    const file = document.getElementById("comprobanteQR")?.files?.[0];
    if (file) {
      try {
        const fd = new FormData();
        fd.append("file", file);

        const r = await fetch("/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (r.ok && d.url) comprobanteUrl = d.url;
      } catch (e) {
        console.error("Error subiendo comprobante:", e);
      }
    }
  }

  // Enviar pedido
  try {
    const res = await fetch("/pedidos/delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        telefono,
        direccion,
        formaPago,
        envio: costoEnvio,
        distanciaKm: 0,
        totalFinal: totalFinalGlobal,
        carrito,
        comprobanteQR: comprobanteUrl,
        horaEntrega
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      alert("Error guardando el pedido.");
      return;
    }
  } catch (e) {
    console.error(e);
    alert("Ocurrió un error.");
    return;
  }

  // POPUP FINAL
  const popup = document.getElementById("popupFinal");
  popup.style.display = "flex";

  localStorage.setItem(
    "pedidoActual",
    JSON.stringify({
      nombre,
      monto: totalFinalGlobal,
      carrito
    })
  );

  localStorage.setItem(
    "mensajeCliente",
    `Gracias ${nombre}, tu pedido para las ${horaEntrega} está siendo preparado.`
  );

  localStorage.removeItem("cart");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 9000);
}

window.finalizarDelivery = finalizarDelivery;

// =======================================
// INICIO
// =======================================
window.addEventListener("DOMContentLoaded", () => {
  renderCarritoResumen();
  cargarCostoEnvio();

  const selectPago = document.getElementById("formaPago");
  const qrSection = document.getElementById("qrSection");

  selectPago.addEventListener("change", () => {
    qrSection.style.display = selectPago.value === "qr" ? "block" : "none";
  });
});
