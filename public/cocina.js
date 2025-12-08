// =======================
// VALIDAR LOGIN
// =======================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// =======================
// ESTADO LOCAL
// =======================
let ultimosIds = new Set();

// =======================
// FULLSCREEN
// =======================
function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  } catch (e) {
    console.error("Fullscreen error:", e);
  }
}
window.toggleFullscreen = toggleFullscreen;

// =======================
// TABS (TODOS / PROGRAMADOS)
// =======================
function verTab(tipo) {
  const allWrapper = document.getElementById("kitchenAllWrapper");
  const progWrapper = document.getElementById("kitchenProgWrapper");
  const tabAll = document.getElementById("tabAll");
  const tabProg = document.getElementById("tabProg");

  if (tipo === "prog") {
    progWrapper.style.display = "block";
    allWrapper.style.display = "none";
    tabProg.classList.add("active");
    tabAll.classList.remove("active");
  } else {
    progWrapper.style.display = "none";
    allWrapper.style.display = "block";
    tabAll.classList.add("active");
    tabProg.classList.remove("active");
  }
}
window.verTab = verTab;

// =======================
// UTILIDADES HORA PROGRAMADA
// =======================
function esProgramado(p) {
  return p.hora_entrega && String(p.hora_entrega).trim() !== "";
}

// Devuelve un Date con la hora de hoy según p.hora_entrega ("HH:MM")
function getHoraEntregaDate(p) {
  if (!esProgramado(p)) return null;

  const texto = String(p.hora_entrega).trim();
  const match = texto.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const now = new Date();
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return null;

  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0,
    0
  );
  return d;
}

// Devuelve clase de semáforo según diferencia con ahora
function getClaseSemaforo(p) {
  const d = getHoraEntregaDate(p);
  if (!d) return "";

  const ahora = new Date();
  const diffMin = (d.getTime() - ahora.getTime()) / 60000; // minutos

  // VENCIDO (más de 5 min pasada la hora) -> rojo parpadeando
  if (diffMin <= -5) return "k-sem-rojo k-sem-parpadeo";
  // Dentro de los últimos 5 min antes de la hora -> rojo
  if (diffMin <= 5) return "k-sem-rojo";
  // Menos de 15 min -> naranja
  if (diffMin <= 15) return "k-sem-naranja";
  // Menos de 30 min -> amarillo
  if (diffMin <= 30) return "k-sem-amarillo";
  // Más tiempo -> verde
  return "k-sem-verde";
}

// =======================
// CARGAR PEDIDOS
// =======================
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

    const pedidos = await res.json();
    const visibles = pedidos.filter(p => p.estado !== "entregado");

    // Tab principal "Todos": mostramos todos
    renderPedidosEnGrid(visibles, "kitchenGrid", "kitchenEmpty");

    // Tab "Programados": solo los que tienen hora_entrega
    const programados = visibles.filter(esProgramado);
    // Ordenar por hora de entrega ascendente
    programados.sort((a, b) => {
      const da = getHoraEntregaDate(a);
      const db = getHoraEntregaDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
    renderPedidosEnGrid(programados, "kitchenProgGrid", "kitchenProgEmpty", true);

  } catch (e) {
    console.error("Error cargando pedidos en cocina:", e);
  }
}

// =======================
// RENDER GENERICO
// =======================
function renderPedidosEnGrid(pedidos, gridId, emptyId, esTabProgramados = false) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

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

    // Nuevo pedido -> animación + sonido
    if (!ultimosIds.has(p.id)) {
      card.classList.add("nuevo");
      const audio = document.getElementById("sonidoNuevo");
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    }

    const estadoClass = getClaseEstado(p.estado);
    const estadoLabel = (p.estado || "pendiente").toUpperCase();

    // Comentario + admin del último cambio de estado (si el backend lo envía)
    let comentarioHtml = "";
    if (p.estado_logs && p.estado_logs.length) {
      const ultimo = p.estado_logs[p.estado_logs.length - 1];
      comentarioHtml = `
        <div class="k-comentario">
          💬 ${ultimo.comentario || "-"} · 👤 ${ultimo.admin || ""}
        </div>
      `;
    }

    // Hora programada + semáforo
    let horaProgHtml = "";
    if (esProgramado(p)) {
      const claseSem = getClaseSemaforo(p);
      horaProgHtml = `
        <div class="k-hora-entrega">
          <span class="k-hora-label">⏱ ${p.hora_entrega}</span>
          <span class="k-semaforo ${claseSem}"></span>
        </div>
      `;
    }

    // items
    let itemsHtml = "";
    try {
      const items = JSON.parse(p.items_json || "[]");
      if (items.length) {
        itemsHtml += "<strong>Items:</strong>";
        items.forEach(it => {
          itemsHtml += `${it.cantidad || 1} × ${it.nombre}<br>`;
        });
      } else {
        itemsHtml = "<em>Sin detalle de items</em>";
      }
    } catch (e) {
      itemsHtml = "<em>Error leyendo items</em>";
    }

    const horaCreacion = p.fecha_hora
      ? new Date(p.fecha_hora).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

    const tipoTexto = p.tipo || "local";

    card.innerHTML = `
      <div class="k-header-line">
        <div>
          <div class="k-id">#${p.id}</div>
          <div class="k-nombre">${p.nombre_cliente || "Sin nombre"}</div>
        </div>
        <div class="k-estado ${estadoClass}">
          ${estadoLabel}
        </div>
      </div>

      ${horaProgHtml}
      ${comentarioHtml}

      <div class="k-header-line">
        <div class="k-total">$${p.total ?? 0}</div>
        <div style="font-size:12px;">${tipoTexto}</div>
      </div>

      <div class="k-items">${itemsHtml}</div>

      <div class="k-info">
        Creado: ${horaCreacion}
        ${p.forma_pago ? " · Pago: " + p.forma_pago : ""}
      </div>

      <div class="k-footer">
        <button class="k-btn k-btn-prep"
                onclick="cambiarEstadoCocina(${p.id}, 'preparando')">
          Preparar
        </button>

        <button class="k-btn k-btn-listo"
                onclick="marcarListoCocina(${p.id})">
          Listo
        </button>

        <button class="k-btn k-btn-camino"
                onclick="cambiarEstadoCocina(${p.id}, 'en_camino')">
          En camino
        </button>

        <button class="k-btn k-btn-entregado"
                onclick="cambiarEstadoCocina(${p.id}, 'entregado')">
          Entregado
        </button>

        <button class="k-btn k-btn-print"
                onclick="imprimirComanda(${p.id})">
          Imprimir
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Guardamos ids para saber cuáles son nuevos en el próximo ciclo
  ultimosIds = nuevosIds;
}

// =======================
// CLASE POR ESTADO
// =======================
function getClaseEstado(estado) {
  switch ((estado || "pendiente").toLowerCase()) {
    case "pendiente": return "estado-pendiente";
    case "preparando": return "estado-preparando";
    case "listo": return "estado-listo";
    case "en_camino": return "en_camino";
    case "entregado": return "estado-otro";
    default: return "estado-otro";
  }
}

// =======================
// CAMBIAR ESTADO (CON COMENTARIO)
// =======================
async function cambiarEstadoCocina(id, estado) {
  let comentario = prompt("Comentario opcional:");
  comentario = comentario || "";

  let ruta = "";

  if (estado === "preparando") ruta = `/pedidos_estado/preparando/${id}`;
  else if (estado === "listo") ruta = `/pedidos_estado/listo/${id}`;
  else if (estado === "en_camino") ruta = `/pedidos_estado/encamino/${id}`;
  else if (estado === "entregado") ruta = `/pedidos_estado/entregado/${id}`;
  else return;

  try {
    await fetch(ruta, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ comentario })
    });

    cargarPedidosCocina();
  } catch (e) {
    console.error("Error cambiando estado:", e);
  }
}
window.cambiarEstadoCocina = cambiarEstadoCocina;

// =======================
// LISTO + WHATSAPP + COMENTARIO
// =======================
async function marcarListoCocina(id) {
  let comentario = prompt("Comentario opcional:");
  comentario = comentario || "";

  const res = await fetch("/pedidos", {
    headers: { Authorization: "Bearer " + token }
  });
  const pedidos = await res.json();
  const p = pedidos.find(x => x.id === id);
  if (!p) return;

  await fetch(`/pedidos_estado/listo/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ comentario })
  });

  // Enviar WhatsApp sólo si tiene teléfono
  if (p.telefono) {
    enviarWhatsApp(p);
  }

  cargarPedidosCocina();
}
window.marcarListoCocina = marcarListoCocina;

// =======================
// WHATSAPP DIRECTO (LOCAL vs DELIVERY)
// =======================
function enviarWhatsApp(pedido) {
  const telRaw = pedido.telefono || "";
  const num = telRaw.replace(/\D/g, "");
  if (!num) {
    alert("Este pedido no tiene teléfono cargado.");
    return;
  }

  const nombre = pedido.nombre_cliente || "";
  const total = pedido.total ?? 0;
  const hora = pedido.hora_entrega
    ? ` para las ${pedido.hora_entrega}`
    : "";

  const tipo = (pedido.tipo || "").toLowerCase();
  let mensaje;

  if (tipo.includes("local") || tipo.includes("retiro")) {
    // RETIRO EN LOCAL
    mensaje = `Hola ${nombre}! 🥪
Tu pedido para RETIRAR${hora} ya está LISTO en El Palacio del Sándwich.
Total a pagar: $${total}.
¡Te esperamos! ❤️`;
  } else {
    // DELIVERY
    mensaje = `Hola ${nombre}! 🥪
Tu pedido a DOMICILIO${hora} ya está LISTO y pronto saldrá hacia tu dirección.
Total a pagar: $${total}.
¡Gracias por elegirnos! ❤️`;
  }

  const url = `https://wa.me/549${num}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

// =======================
// IMPRIMIR COMANDA
// =======================
async function imprimirComanda(id) {
  const res = await fetch("/pedidos", {
    headers: { Authorization: "Bearer " + token }
  });

  const pedidos = await res.json();
  const p = pedidos.find(x => x.id === id);
  if (!p) return;

  let itemsHtml = "";
  try {
    const items = JSON.parse(p.items_json || "[]");
    items.forEach(it => {
      itemsHtml += `${it.cantidad || 1} × ${it.nombre}<br>`;
    });
  } catch (e) {
    itemsHtml = "<em>Error leyendo items</em>";
  }

  const horaEntrega = esProgramado(p) ? p.hora_entrega : "-";

  const ticket = `
    <html>
      <head><meta charset="UTF-8"><title>Comanda #${p.id}</title></head>
      <body style="font-family: monospace; padding: 10px;">
        <h2>COMANDA #${p.id}</h2>
        <p><strong>Cliente:</strong> ${p.nombre_cliente || "Sin nombre"}</p>
        <p><strong>Tipo:</strong> ${p.tipo || "local"}</p>
        <p><strong>Hora programada:</strong> ${horaEntrega}</p>
        <p><strong>Total:</strong> $${p.total ?? 0}</p>
        <hr>
        <p><strong>Items:</strong><br>${itemsHtml}</p>
        <hr>
        <p>Estado: ${(p.estado || "pendiente").toUpperCase()}</p>
      </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=400,height=600");
  win.document.write(ticket);
  win.document.close();
  win.print();
}
window.imprimirComanda = imprimirComanda;

// =======================
// LOGOUT
// =======================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
window.logout = logout;

// =======================
// INICIO
// =======================
window.addEventListener("DOMContentLoaded", () => {
  cargarPedidosCocina();
  setInterval(cargarPedidosCocina, 3000);
});
