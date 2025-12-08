// =======================
// VALIDAR LOGIN
// =======================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// =======================
// PRODUCTOS (usa /products)
// =======================
async function cargarProductos() {
  try {
    const res = await fetch("/products");
    const productos = await res.json();

    document.getElementById("stat-productos").textContent = productos.length;

    let ultimo = "-";
    let stockBajo = 0;

    if (productos.length > 0) {
      const ordenados = [...productos].sort((a, b) => b.id - a.id);
      ultimo = ordenados[0].name;

      stockBajo = productos.filter(p =>
        p.stock !== null &&
        (p.stock === 0 || p.stock <= (p.stock_alert || 2))
      ).length;
    }

    document.getElementById("stat-ultimo").textContent = ultimo;
    document.getElementById("stat-stock-bajo").textContent = stockBajo;

  } catch (e) {
    console.error("Error cargando productos:", e);
  }
}

// =======================
// PROMOS (usa /promos)
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
// PEDIDOS PENDIENTES (estado real: pendiente)
// =======================
async function cargarPedidosPendientes() {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + token }
    });

    const pedidos = await res.json();

    const pendientes = pedidos.filter(p => p.estado === "pendiente").length;

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

// =======================
// INICIO
// =======================
window.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  cargarPromos();
  cargarPedidosPendientes();
  verificarReservas();

  setInterval(cargarPedidosPendientes, 10000);
  setInterval(verificarReservas, 15000);
});
