// C:\El palacio del sándwich\server\public\admin-logs.js

// ============================
// VALIDAR LOGIN + ROL SUPERADMIN
// ============================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

let usuarioLogueado = null;

function decodeToken(t) {
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload;
  } catch (e) {
    return null;
  }
}

async function validarSuperadmin() {
  const payload = decodeToken(token);
  usuarioLogueado = payload;

  if (!payload || payload.role !== "superadmin") {
    alert("Solo el SUPERADMIN puede acceder a la auditoría.");
    window.location.href = "dashboard.html";
    return;
  }
}

validarSuperadmin();

// ============================
// NAV
// ============================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

function goBack() {
  window.location.href = "dashboard.html";
}

// ============================
// CARGAR LISTA DE ADMINS PARA FILTRO
// ============================
async function cargarAdminsFiltro() {
  const sel = document.getElementById("filtro-usuario");
  if (!sel) return;

  try {
    const res = await fetch("/admins", {
      headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) return; // si no es superadmin, igual no debería estar acá

    const admins = await res.json();

    admins.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.user} (${a.role})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Error cargando admins para filtro:", e);
  }
}

// ============================
// CARGAR LOGS CON FILTROS
// ============================
async function cargarLogs() {
  const desde = document.getElementById("filtro-desde").value;
  const hasta = document.getElementById("filtro-hasta").value;
  const userId = document.getElementById("filtro-usuario").value;
  const accion = document.getElementById("filtro-accion").value;

  const q = new URLSearchParams();
  if (desde) q.append("from", desde);
  if (hasta) q.append("to", hasta);
  if (userId) q.append("user_id", userId);
  if (accion) q.append("action", accion);

  try {
    const res = await fetch("/logs?" + q.toString(), {
      headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) {
      alert("Error obteniendo logs");
      return;
    }

    const logs = await res.json();
    renderLogsTabla(logs);
    renderLogsDashboard(logs);
  } catch (e) {
    console.error("Error cargando logs:", e);
  }
}

// ============================
// RENDER TABLA
// ============================
function renderLogsTabla(logs) {
  const tbody = document.getElementById("tabla-logs-body");
  tbody.innerHTML = "";

  if (!logs.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">No hay acciones registradas con estos filtros.</td>
      </tr>
    `;
    return;
  }

  logs.forEach((l) => {
    const tr = document.createElement("tr");
    const fecha = new Date(l.timestamp).toLocaleString("es-AR");

    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${l.username || "-"}</td>
      <td>${l.action}</td>
      <td>${l.detalle || ""}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ============================
// RENDER DASHBOARD (RESUMEN)
// ============================
function renderLogsDashboard(logs) {
  const totalAcciones = logs.length;

  const porUsuario = {};
  const porAccion = {};

  logs.forEach((l) => {
    const u = l.username || "Desconocido";
    porUsuario[u] = (porUsuario[u] || 0) + 1;
    porAccion[l.action] = (porAccion[l.action] || 0) + 1;
  });

  const usuariosActivos = Object.keys(porUsuario).length;

  // Acciones de interés
  const altasProductos = porAccion["PRODUCT_CREATE"] || 0;
  const ventasProductos = porAccion["PRODUCT_SELL"] || 0;
  const ventasPromos = porAccion["VENTA_PROMO"] || 0;
  const cambiosStock =
    (porAccion["PRODUCT_UPDATE"] || 0) + (porAccion["PRODUCT_DELETE"] || 0);

  // Resumen
  document.getElementById("stat-acciones").textContent = totalAcciones;
  document.getElementById("stat-usuarios-activos").textContent =
    usuariosActivos;
  document.getElementById("stat-altas").textContent = altasProductos;
  document.getElementById("stat-ventas").textContent =
    ventasProductos + ventasPromos;
  document.getElementById("stat-stock").textContent = cambiosStock;

  // Barras por usuario
  const cont = document.getElementById("logs-barras-usuarios");
  cont.innerHTML = "";

  if (!usuariosActivos) {
    cont.innerHTML = `<p class="lista-vacia">No hubo actividad de usuarios en este período.</p>`;
    return;
  }

  const maxAcciones = Math.max(...Object.values(porUsuario)) || 1;

  Object.entries(porUsuario).forEach(([usuario, cant]) => {
    const barra = document.createElement("div");
    barra.className = "logs-bar-row";

    const ancho = (cant / maxAcciones) * 100;

    barra.innerHTML = `
      <div class="logs-bar-label">${usuario}</div>
      <div class="logs-bar-track">
        <div class="logs-bar-fill" style="width:${ancho}%;"></div>
      </div>
      <div class="logs-bar-value">${cant}</div>
    `;

    cont.appendChild(barra);
  });
}

// ============================
// EXPORTAR A EXCEL
// ============================
function exportarExcelLogs() {
  const desde = document.getElementById("filtro-desde").value;
  const hasta = document.getElementById("filtro-hasta").value;
  const userId = document.getElementById("filtro-usuario").value;
  const accion = document.getElementById("filtro-accion").value;

  const q = new URLSearchParams();
  if (desde) q.append("from", desde);
  if (hasta) q.append("to", hasta);
  if (userId) q.append("user_id", userId);
  if (accion) q.append("action", accion);

  const url = "/logs/export/excel?" + q.toString();
  window.open(url, "_blank");
}

// ============================
// INIT
// ============================
window.addEventListener("DOMContentLoaded", () => {
  // fijar filtros por defecto (hoy)
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("filtro-desde").value = hoy;
  document.getElementById("filtro-hasta").value = hoy;

  cargarAdminsFiltro();
  cargarLogs();

  document
    .getElementById("btn-aplicar")
    .addEventListener("click", () => cargarLogs());
  document
    .getElementById("btn-excel")
    .addEventListener("click", () => exportarExcelLogs());
});

window.logout = logout;
window.goBack = goBack;
