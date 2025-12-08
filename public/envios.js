// public/envios.js

const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

function goBack() {
  window.location.href = "admin.html";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ===============================
// CARGAR CONFIGURACIÓN ACTUAL
// ===============================
async function cargarConfig() {
  try {
    const res = await fetch("/config", {
      headers: { Authorization: "Bearer " + token }
    });

    // Si el backend ahora deja GET público no pasa nada por mandar el token igual
    const data = await res.json();

    document.getElementById("envio_fijo").value =
      data.envio_fijo != null ? data.envio_fijo : 0;

    document.getElementById("envio_gratis_desde").value =
      data.envio_gratis_desde != null ? data.envio_gratis_desde : 0;
  } catch (e) {
    console.error("Error cargando configuración de envíos:", e);
  }
}

// ===============================
// GUARDAR CONFIGURACIÓN
// ===============================
async function guardarEnvios() {
  const msg = document.getElementById("msg");
  msg.className = "mensaje";
  msg.style.display = "none";

  const body = {
    envio_fijo: Number(document.getElementById("envio_fijo").value || 0),
    envio_gratis_desde: Number(
      document.getElementById("envio_gratis_desde").value || 0
    ),
  };

  try {
    const res = await fetch("/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      msg.textContent = "Configuración guardada correctamente";
      msg.className = "mensaje ok";
    } else {
      msg.textContent = "Error guardando la configuración";
      msg.className = "mensaje error";
    }
  } catch (e) {
    console.error("Error guardando envíos:", e);
    msg.textContent = "Error guardando la configuración";
    msg.className = "mensaje error";
  }
}

document.addEventListener("DOMContentLoaded", cargarConfig);
