// =======================
// VALIDAR LOGIN
// =======================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// =======================
// NAVEGACIÓN
// =======================
function irHome() { window.location.href = "/"; }
function irProductos() { window.location.href = "productos.html"; }
function irPromos() { window.location.href = "promociones.html"; }
function irCategorias() { window.location.href = "categorias.html"; }
function irPedidos() { window.location.href = "pedidos.html"; }
function irStock() { window.location.href = "stock.html"; }
function irEnvios() { window.location.href = "envios.html"; }
function irAdmins() { window.location.href = "admin-config.html"; }
function irCocina() { window.location.href = "cocina.html"; }
function irClientes() { window.location.href = "clientes.html"; }
function irReportes() { window.location.href = "reportes.html"; }

// =======================
// PRODUCTOS
// =======================
async function cargarProductos() {
  try {
    const res = await fetch("/products");
    const productos = await res.json();

    document.getElementById("stat-productos").textContent = productos.length;

    let ultimo = "-";
    let stockBajo = 0;

    if (productos.length) {
      const ordenados = [...productos].sort((a, b) => b.id - a.id);
      ultimo = ordenados[0].name;

      stockBajo = productos.filter((p) => {
        if (p.stock == null) return false;
        if (p.stock === 0) return true;
        return p.stock <= (p.stock_alert || 2);
      }).length;
    }

    document.getElementById("stat-ultimo").textContent = ultimo;
    document.getElementById("stat-stock-bajo").textContent = stockBajo;

  } catch (e) {
    console.error("Error cargando productos:", e);
  }
}

// =======================
// PROMOS
// =======================
async function cargarPromos() {
  try {
    const res = await fetch("/promos");
    const promos = await res.json();

    document.getElementById("stat-promos").textContent = promos.length;

  } catch (e) {
    console.error("Error cargando promos:", e);
  }
}

// =======================
// PEDIDOS PENDIENTES
// =======================
async function cargarPedidosPendientes() {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + token }
    });

    if (res.status === 401) {
      alert("Sesión expirada");
      logout();
      return;
    }

    const pedidos = await res.json();
    const pendientes = pedidos.filter(p => p.estado !== "entregado").length;

    document.getElementById("stat-pendientes").textContent = pendientes;

  } catch (e) {
    console.error("Error cargando pedidos pendientes:", e);
  }
}

// =======================
// RESERVAS PENDIENTES
// =======================
async function verificarReservas() {
  try {
    const res = await fetch("/reservas", {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();
    const pendientes = data.filter(r => r.estado === "pendiente").length;

    document.getElementById("badgeReservas").textContent = pendientes;

    if (pendientes > 0) {
      new Audio("sonidos/nuevo_pedido.mp3").play();
    }
  } catch (e) {
    console.error("Error verificando reservas:", e);
  }
}

setInterval(verificarReservas, 15000);
verificarReservas();

// =======================
// PEDIDOS POR HORA (HOY)
// =======================
async function cargarPedidosPorHora() {
  try {
    const res = await fetch("/pedidos/por_hora", {
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token 
      }
    });

    if (!res.ok) {
      console.error("Error al obtener pedidos por hora:", await res.text());
      return;
    }

    const data = await res.json();

    const horas = data.map(r => r.hora + ":00");
    const cantidades = data.map(r => r.cantidad);

    const canvas = document.getElementById("graficoHoras");
    if (!canvas) return;

    if (window.graficoHorasInstancia) {
      window.graficoHorasInstancia.destroy();
    }

    window.graficoHorasInstancia = new Chart(canvas, {
      type: "bar",
      data: {
        labels: horas,
        datasets: [{
          label: "Pedidos",
          data: cantidades,
          backgroundColor: "#d62828",
          borderColor: "#9e1b1b",
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

  } catch (e) {
    console.error("Error en cargarPedidosPorHora:", e);
  }
}

// =======================
// INICIO
// =======================
window.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  cargarPromos();
  cargarPedidosPendientes();
  cargarPedidosPorHora();

  setInterval(cargarPedidosPendientes, 10000);
  setInterval(cargarPedidosPorHora, 60000); // refrescar cada 1 minuto
});

