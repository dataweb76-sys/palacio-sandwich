// C:\El palacio del sándwich\server\public\reservas_admin.js

// VALIDACIÓN DE LOGIN
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// CARGAR RESERVAS AL INICIAR
window.addEventListener("DOMContentLoaded", cargarReservas);

// ================================================
// CARGAR RESERVAS DESDE BACKEND
// ================================================
async function cargarReservas() {
  try {
    const res = await fetch("/reservas", {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();
    const tbody = document.querySelector("#tablaReservas tbody");
    tbody.innerHTML = "";

    data.forEach(r => {
      const tr = document.createElement("tr");

      const nombreCompleto = [r.nombre || "", r.apellido || ""].join(" ").trim();

      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${nombreCompleto}</td>
        <td>${r.fecha_reserva || ""}</td>
        <td>${r.hora || ""}</td>
        <td>${r.tipo_evento || "-"}</td>
        <td>${formatearEstado(r.estado)}</td>
        <td>
          <button class="btn-table" onclick="verDetalle(${r.id})">
            Ver / Presupuesto
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (e) {
    console.error("Error cargando reservas:", e);
  }
}

// ================================================
// FORMATEAR ESTADO
// ================================================
function formatearEstado(estado) {
  if (estado === "confirmado") {
    return `<span class="estado-confirmado">Confirmado</span>`;
  }
  if (estado === "presupuestado") {
    return `<span class="estado-presupuestado">Presupuestado</span>`;
  }
  return `<span class="estado-pendiente">Pendiente</span>`;
}

// ================================================
// ABRIR DETALLE
// ================================================
function verDetalle(id) {
  window.location.href = `admin/reserva_detalle.html?id=${id}`;
}

// ================================================
// BUSCADOR POR NOMBRE
// ================================================
function filtrar() {
  const valor = document.getElementById("buscador").value.toLowerCase();
  const filas = document.querySelectorAll("#tablaReservas tbody tr");

  filas.forEach(f => {
    const nombre = f.children[1].textContent.toLowerCase();
    f.style.display = nombre.includes(valor) ? "" : "none";
  });
}
