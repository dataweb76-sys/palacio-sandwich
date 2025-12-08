// ===============================
// TOKEN DEL ADMIN
// ===============================
function getToken() {
  return localStorage.getItem("token") || "";
}

// ===============================
// ABRIR WHATSAPP WEB
// ===============================
function abrirWhatsApp(numero, mensaje) {
  const num = numero.replace(/\D/g, "");
  const url = `https://wa.me/549${num}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

// ===============================
// CARGAR PEDIDOS
// ===============================
async function cargarPedidos() {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + getToken() }
    });

    const pedidos = await res.json();
    renderTabla(pedidos);
  } catch (e) {
    console.error(e);
  }
}

let idsPrevios = new Set();

// ===============================
// RENDER TABLA
// ===============================
function renderTabla(pedidos) {
  const tbody = document.querySelector("#tablaPedidos tbody");
  tbody.innerHTML = "";

  const idsActuales = new Set();

  pedidos.forEach(p => {
    idsActuales.add(p.id);
    const tr = document.createElement("tr");

    const esNuevo = !idsPrevios.has(p.id);
    tr.className = esNuevo ? "nuevo-pedido" : "";

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nombre_cliente}</td>
      <td><span class="tipo-badge tipo-${p.tipo}">${p.tipo}</span></td>
      <td>$${p.total}</td>
      <td>${p.forma_pago}</td>
      <td>${p.estado}</td>
      <td>${p.fecha_hora}</td>
      <td>
        <button onclick="verPedido(${p.id})">Ver</button>
        ${
          p.estado !== "entregado"
            ? `<button onclick="marcarListo(${p.id})" class="btn-listo">Listo</button>`
            : ""
        }
        <button onclick="marcarEnCamino(${p.id})" class="btn-camino">En camino</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  idsPrevios = idsActuales;
}
async function marcarListoConWhatsApp(id) {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + token }
    });
    
    const pedidos = await res.json();
    const p = pedidos.find(x => x.id === id);
    if (!p) return;

    // Cambiar estado a listo
    await fetch(`/pedidos_estado/listo/${id}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    // Enviar WhatsApp
    enviarWhatsApp(p.nombre_cliente, p.telefono, p.total);

    // Recargar tabla
    cargarPedidos();
  } catch (e) {
    console.error("Error al marcar listo:", e);
  }
}

// ===============================
// VER DETALLE
// ===============================
async function verPedido(id) {
  const res = await fetch("/pedidos", {
    headers: { Authorization: "Bearer " + getToken() }
  });
  const pedidos = await res.json();
  const p = pedidos.find(x => x.id === id);

  if (!p) return;

  const div = document.getElementById("detallePedido");
  const items = JSON.parse(p.items_json || "[]");

  let html = `
    <strong>Cliente:</strong> ${p.nombre_cliente}<br>
    <strong>Teléfono:</strong> ${p.telefono}<br>
    <strong>Dirección:</strong> ${p.direccion}<br>
    <strong>Estado:</strong> ${p.estado}<br><br>
    <h4>Items</h4>
  `;

  items.forEach(i => {
    html += `${i.cantidad} × ${i.nombre} - $${i.precio}<br>`;
  });

  div.innerHTML = html;
  document.getElementById("modalPedido").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modalPedido").style.display = "none";
}

// ===============================
// MARCAR LISTO + ABRIR WHATSAPP
// ===============================
async function marcarListo(id) {
  if (!confirm("¿Confirmar pedido listo?")) return;

  const res = await fetch(`/pedidos_estado/listo/${id}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + getToken() }
  });

  const data = await res.json();
  if (!data.ok) return alert("Error al marcar como listo");

  const p = data.pedido;

  // construir mensaje
  let pagoMsg = "";
  if (p.forma_pago === "efectivo") pagoMsg = `El total es $${p.total}.`;
  if (p.forma_pago === "tarjeta") pagoMsg = `Pagás con tarjeta al recibir ($${p.total}).`;
  if (p.forma_pago === "qr") pagoMsg = p.pagado ? `Pago recibido ✔️` : `Recordá abonar $${p.total} por QR.`;

  const mensaje = `
Hola ${p.nombre_cliente}! 🥪
Tu pedido ya está LISTO y sale hacia tu domicilio 🚗💨
${pagoMsg}
¡Gracias por elegirnos! ❤️
`;

  abrirWhatsApp(p.telefono, mensaje);
  cargarPedidos();
}

// ===============================
// MARCAR EN CAMINO + WHATSAPP
// ===============================
async function marcarEnCamino(id) {
  const res = await fetch(`/pedidos_estado/encamino/${id}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + getToken() }
  });

  const data = await res.json();
  if (!data.ok) return alert("Error");

  const p = data.pedido;

  const mensaje = `
Hola ${p.nombre_cliente}! 🚴‍♂️💨
El repartidor ya está en camino.
En unos minutos estará en tu domicilio.
¡Muchas gracias! ❤️
`;

  abrirWhatsApp(p.telefono, mensaje);
  cargarPedidos();
}
function enviarWhatsApp(nombre, telefono, total) {
  if (!telefono) {
    alert("El cliente no tiene teléfono cargado.");
    return;
  }

  // Limpia caracteres
  const num = telefono.replace(/\D/g, "");

  const mensaje = `Hola ${nombre}! 🥪
Tu pedido ya está LISTO y sale hacia tu domicilio. 🚗💨
Total a pagar: $${total}.
¡Gracias por elegirnos! ❤️`;

  const url = `https://wa.me/549${num}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
}


// ===============================
// LOGOUT Y VOLVER
// ===============================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

function goBack() {
  window.location.href = "admin.html";
}

// ===============================
window.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();
  setInterval(cargarPedidos, 5000);
});
