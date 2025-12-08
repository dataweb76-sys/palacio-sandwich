// ==========================================
// TOKEN
// ==========================================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// sonido nuevo pedido
const sonidoNuevoPedido = new Audio("sonidos/nuevo_pedido.mp3");
sonidoNuevoPedido.volume = 0.8;

let ultimoMaxID = 0;
let nuevosIDs = new Set();
let pedidosCocina = [];

let filtroEstado = "todos";   // todos | pendiente | preparando | listo | entregado
let filtroCategoria = "todos"; // todos | miga | pizza | masamadre | arabitos

function salirCocina() {
  window.location.href = "pedidos.html";
}

// ==========================================
// HORA EN HEADER
// ==========================================
function actualizarHora() {
  const el = document.getElementById("cocinaHora");
  if (!el) return;
  const ahora = new Date();
  el.textContent = ahora.toLocaleString("es-AR").replace(", ", " - ");
}
setInterval(actualizarHora, 1000);
actualizarHora();

// ==========================================
// CARGAR PEDIDOS
// ==========================================
async function cargarCocina() {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + token },
    });

    if (res.status === 401) {
      alert("Sesión expirada");
      window.location.href = "login.html";
      return;
    }

    const lista = await res.json();

    detectarNuevos(lista);
    pedidosCocina = lista;
    renderCocina(lista);

  } catch (e) {
    console.error("Error cargando pedidos cocina:", e);
  }
}

// ==========================================
// DETECTAR NUEVOS
// ==========================================
function detectarNuevos(lista) {
  if (!lista.length) return;

  const maxID = Math.max(...lista.map((p) => p.id));

  if (ultimoMaxID === 0) {
    // primera carga, no sonar
    ultimoMaxID = maxID;
    nuevosIDs = new Set();
    return;
  }

  if (maxID > ultimoMaxID) {
    const nuevos = lista.filter((p) => p.id > ultimoMaxID).map((p) => p.id);
    nuevosIDs = new Set(nuevos);
    ultimoMaxID = maxID;

    if (nuevos.length) {
      sonidoNuevoPedido.play();
    }
  } else {
    nuevosIDs = new Set();
  }
}

// ==========================================
// CATEGORIZAR PEDIDO (A: aparece en TODAS las categorías que aplique)
// ==========================================
function obtenerCategoriasPedido(pedido) {
  const cats = new Set();
  let items = [];

  try {
    items = JSON.parse(pedido.items_json || "[]");
  } catch {
    items = [];
  }

  items.forEach((i) => {
    const cat = (i.categoria || i.category || "").toLowerCase();
    const nombre = (i.nombre || "").toLowerCase();

    if (cat.includes("miga") || nombre.includes("miga")) cats.add("miga");
    if (cat.includes("pizza") || nombre.includes("pizza")) cats.add("pizza");
    if (cat.includes("masa")) cats.add("masamadre");
    if (
      cat.includes("arabi") ||
      nombre.includes("arabito") ||
      nombre.includes("árabe") ||
      nombre.includes("arabe")
    )
      cats.add("arabitos");
  });

  if (cats.size === 0) cats.add("general");

  return Array.from(cats);
}

// ==========================================
// RENDER
// ==========================================
function renderCocina(lista) {
  const grid = document.getElementById("cocinaGrid");
  grid.innerHTML = "";

  // contadores por estado
  const contadores = {
    pendiente: 0,
    preparando: 0,
    listo: 0,
    entregado: 0,
  };

  lista.forEach((p) => {
    const est = (p.estado || "pendiente").toLowerCase();
    if (contadores[est] !== undefined) contadores[est]++;
  });

  const total = lista.length;
  document.getElementById("cnt-todos").textContent = total;
  document.getElementById("cnt-pendiente").textContent = contadores.pendiente;
  document.getElementById("cnt-preparando").textContent = contadores.preparando;
  document.getElementById("cnt-listo").textContent = contadores.listo;
  document.getElementById("cnt-entregado").textContent = contadores.entregado;

  // filtrar por estado + categoría
  const filtrados = lista.filter((p) => {
    const est = (p.estado || "pendiente").toLowerCase();

    if (filtroEstado !== "todos" && est !== filtroEstado) return false;

    const cats = obtenerCategoriasPedido(p);
    if (filtroCategoria === "todos") return true;

    return cats.includes(filtroCategoria);
  });

  if (!filtrados.length) {
    grid.innerHTML = `<p style="color:#ccc;font-size:16px;">No hay pedidos con estos filtros.</p>`;
    return;
  }

  filtrados.forEach((p) => {
    const est = (p.estado || "pendiente").toLowerCase();
    const cats = obtenerCategoriasPedido(p);

    let estadoClass = "estado-pendiente";
    let estadoLabel = "Pendiente";

    if (est === "preparando") {
      estadoClass = "estado-preparando";
      estadoLabel = "Preparando";
    } else if (est === "listo") {
      estadoClass = "estado-listo";
      estadoLabel = "Listo";
    } else if (est === "entregado") {
      estadoClass = "estado-entregado";
      estadoLabel = "Entregado";
    }

    let items = [];
    try {
      items = JSON.parse(p.items_json || "[]");
    } catch {
      items = [];
    }

    const itemsHtml = items
      .map(
        (i) =>
          `<div>${i.cantidad} × ${i.nombre} <span style="opacity:.7;">$${i.precio}</span></div>`
      )
      .join("");

    const esNuevo = nuevosIDs.has(p.id) ? "nuevo-order" : "";

    const catsHtml = cats
      .map((c) => {
        if (c === "miga") return `<span class="cat-pill">Miga</span>`;
        if (c === "pizza") return `<span class="cat-pill">Pizza</span>`;
        if (c === "masamadre") return `<span class="cat-pill">Masa madre</span>`;
        if (c === "arabitos") return `<span class="cat-pill">Arabitos</span>`;
        return `<span class="cat-pill">General</span>`;
      })
      .join("");

    grid.innerHTML += `
      <div class="cocina-card ${esNuevo}">
        <div class="cocina-card-header">
          <h2>#${p.id} — ${p.nombre_cliente}</h2>
          <div class="cocina-card-total">$${p.total}</div>
        </div>

        <div class="cocina-card-pago">
          Forma de pago: <strong>${p.forma_pago}</strong>
        </div>

        <div class="cocina-card-estado">
          <span class="estado-pill ${estadoClass}">${estadoLabel}</span>
        </div>

        <div class="cocina-card-categorias">
          ${catsHtml}
        </div>

        <div class="cocina-card-items">
          ${itemsHtml}
        </div>

        <div class="cocina-card-actions">
          <button class="btn-cocina btn-preparar"
            onclick="marcarPreparando(${p.id})"
            ${est !== "pendiente" ? "disabled" : ""}>
            Preparar
          </button>

          <button class="btn-cocina btn-listo"
            onclick="marcarListo(${p.id})"
            ${est === "entregado" ? "disabled" : ""}>
            Listo
          </button>

          <button class="btn-cocina btn-entregado"
            onclick="marcarEntregado(${p.id})"
            ${est !== "listo" ? "disabled" : ""}>
            Entregado
          </button>
        </div>
      </div>
    `;
  });
}

// ==========================================
// ACCIONES DE ESTADO
// ==========================================
async function marcarPreparando(id) {
  await fetch(`/pedidos_estado/preparando/${id}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
  cargarCocina();
}

async function marcarListo(id) {
  await fetch(`/pedidos_estado/listo/${id}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });

  // abrir pantalla verde
  const p = pedidosCocina.find((x) => x.id === id);
  const nombre = p ? p.nombre_cliente : "";
  const url = `pedidos_final.html?id=${id}&cliente=${encodeURIComponent(
    nombre
  )}`;
  window.open(url, "pedidoListo", "width=800,height=600");

  cargarCocina();
}

async function marcarEntregado(id) {
  await fetch(`/pedidos_estado/entregado/${id}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
  cargarCocina();
}

// ==========================================
// FILTROS
// ==========================================
function setFiltroEstado(est) {
  filtroEstado = est;
  const ids = [
    "todos",
    "pendiente",
    "preparando",
    "listo",
    "entregado",
  ];
  ids.forEach((e) => {
    const btn = document.getElementById("f-estado-" + e);
    if (!btn) return;
    btn.classList.toggle("activo", e === est);
  });
  renderCocina(pedidosCocina);
}

function setFiltroCategoria(cat) {
  filtroCategoria = cat;
  const map = {
    todos: "f-cat-todos",
    miga: "f-cat-miga",
    pizza: "f-cat-pizza",
    masamadre: "f-cat-masam",
    arabitos: "f-cat-arabitos",
  };
  Object.entries(map).forEach(([clave, idBtn]) => {
    const btn = document.getElementById(idBtn);
    if (!btn) return;
    btn.classList.toggle("activo", clave === cat);
  });
  renderCocina(pedidosCocina);
}

// ==========================================
// AUTOREFRESH
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  cargarCocina();
  setInterval(cargarCocina, 7000);
});
