// =====================================================
// COCINA.JS – COMPLETO, ORDENADO Y OPTIMIZADO
// =====================================================

// VALIDA LOGIN
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

let ultimosIds = new Set();

// ==============================
// CARGAR PEDIDOS
// ==============================
async function cargarPedidosCocina() {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + token }
    });

    if (res.status === 401) {
      alert("Sesión expirada");
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    let pedidos = await res.json();

    // Filtrar solo los NO entregados
    pedidos = pedidos.filter(p => p.estado !== "entregado");

    renderPedidosCocina(pedidos);

  } catch (e) {
    console.error("Error cargando pedidos cocina:", e);
  }
}

// ==============================
// RENDERIZAR TARJETAS
// ==============================
function renderPedidosCocina(pedidos) {
  const grid = document.getElementById("kitchenGrid");
  const empty = document.getElementById("kitchenEmpty");

  grid.innerHTML = "";

  if (!pedidos.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const nuevosIds = new Set();

  pedidos.forEach(p => {
    nuevosIds.add(p.id);

    const card = document.createElement("div");
    card.className = "k-card";

    // -------------------------------------------
    // ALERTAS POR HORA DE ENTREGA
    // -------------------------------------------
    if (p.hora_entrega) {
      try {
        const ahora = new Date();
        const [h, m] = p.hora_entrega.split(":");
        const pedidoDate = new Date();
        pedidoDate.setHours(Number(h), Number(m), 0, 0);

        const diffMin = Math.floor((pedidoDate - ahora) / 60000);

        if (diffMin <= 10 && diffMin >= 0) {
          card.classList.add("alerta-hora");
        }
        if (diffMin < 0) {
          card.classList.add("retrasado");
        }
      } catch (e) {
        console.warn("Error interpretando hora_entrega:", p.hora_entrega);
      }
    }

    // NUEVO PEDIDO → animación + sonido
    if (!ultimosIds.has(p.id)) {
      card.classList.add("nuevo");
      const audio = document.getElementById("sonidoNuevo");
      audio?.play().catch(() => {});
    }

    const estadoClass = getClaseEstado(p.estado);
    const estadoLabel = (p.estado || "pendiente").toUpperCase();

    // Items
    let itemsHtml = "";
    try {
      const items = JSON.parse(p.items_json || "[]");
      items.forEach(it => {
        itemsHtml += `${it.cantidad} × ${it.nombre}<br>`;
      });
    } catch {
      itemsHtml = "<em>Error leyendo items</em>";
    }

    // Hora reg.
    const hora = p.fecha_hora
      ? new Date(p.fecha_hora).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

    card.innerHTML = `
      <div class="k-header-line">
        <div>
          <div class="k-id">#${p.id}</div>
          <div class="k-nombre">${p.nombre_cliente || "---"}</div>
        </div>

        <div class="k-estado ${estadoClass}">
          ${estadoLabel}
        </div>
      </div>

      <div class="k-items">
        <strong>Items:</strong><br>
        ${itemsHtml}
      </div>

      <div class="k-info">
        Hora pedido: ${hora}<br>
        ${
          p.hora_entrega
            ? `<div class="k-hora-alert">⏰ Retiro: ${p.hora_entrega}</div>`
            : ""
        }
      </div>

      <div class="k-footer">
        <button class="k-btn k-btn-prep" onclick="cambiarEstadoCocina(${p.id}, 'preparando')">Preparar</button>
        <button class="k-btn k-btn-listo" onclick="marcarListoCocina(${p.id})">Listo</button>
        <button class="k-btn k-btn-camino" onclick="cambiarEstadoCocina(${p.id}, 'en_camino')">En camino</button>
        <button class="k-btn k-btn-entregado" onclick="cambiarEstadoCocina(${p.id}, 'entregado')">Entregado</button>
        <button class="k-btn k-btn-print" onclick="imprimirComanda(${p.id})">🖨 Imprimir</button>
      </div>
    `;

    grid.appendChild(card);
  });

  ultimosIds = nuevosIds;
}

// ==============================
// CLASE SEGÚN ESTADO
// ==============================
function getClaseEstado(estado) {
  switch ((estado || "").toLowerCase()) {
    case "pendiente": return "estado-pendiente";
    case "preparando": return "estado-preparando";
    case "listo": return "estado-listo";
    case "en_camino": return "en_camino";
    default: return "estado-otro";
  }
}

// ==============================
// CAMBIAR ESTADO
// ==============================
async function cambiarEstadoCocina(id, estado) {
  let comentario = prompt("Comentario opcional:") || "";

  const rutas = {
    preparando: `/pedidos_estado/preparando/${id}`,
    listo: `/pedidos_estado/listo/${id}`,
    en_camino: `/pedidos_estado/encamino/${id}`,
    entregado: `/pedidos_estado/entregado/${id}`
  };

  const ruta = rutas[estado];
  if (!ruta) return;

  await fetch(ruta, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ comentario })
  });

  cargarPedidosCocina();
}

// ==============================
// LISTO → ENVÍA WHATSAPP SOLO DELIVERY
// ==============================
async function marcarListoCocina(id) {
  let comentario = prompt("Comentario opcional:") || "";

  const res = await fetch("/pedidos", {
    headers: { Authorization: "Bearer " + token }
  });
  const pedidos = await res.json();
  const p = pedidos.find(x => x.id === id);
  if (!p) return;

  // Actualizar estado
  await fetch(`/pedidos_estado/listo/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ comentario })
  });

  // SOLO DELIVERY → WhatsApp
  if (p.tipo === "delivery") {
    enviarWhatsApp(p.nombre_cliente, p.telefono, p.total);
  }

  cargarPedidosCocina();
}

// ==============================
// WHATSAPP AUTOMÁTICO DELIVERY
// ==============================
function enviarWhatsApp(nombre, telefono, total) {
  const num = telefono.replace(/\D/g, "");
  const mensaje = `Hola ${nombre}! 🥪
Tu pedido ya está LISTO y saldrá hacia tu domicilio 🚗💨
Total: $${total}
¡Gracias por elegirnos!`;

  window.open(`https://wa.me/549${num}?text=${encodeURIComponent(mensaje)}`, "_blank");
}

// ==============================
// IMPRIMIR COMANDA
// ==============================
async function imprimirComanda(id) {
  const res = await fetch("/pedidos", {
    headers: { Authorization: "Bearer " + token }
  });

  const pedidos = await res.json();
  const p = pedidos.find(x => x.id === id);
  if (!p) return;

  let itemsHtml = "";
  const items = JSON.parse(p.items_json || "[]");
  items.forEach(it => {
    itemsHtml += `${it.cantidad} × ${it.nombre}<br>`;
  });
