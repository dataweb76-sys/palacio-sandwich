/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let carrito = [];
try {
  carrito = JSON.parse(localStorage.getItem("cart") || "[]");
} catch (e) {
  carrito = [];
}

let categoriasCliente = [];
let heroIndex = 0;

const heroImages = [
  "bannerpalacios.jpg",
  "arabitos.png",
  "pizza.png",
  "sandmiga.png",
  "home-masamadre-mobile-compress1.png",
];

/* Reservas: estado en memoria */
let reservaProductosLista = [];   // productos que vienen de /reservas/productos
let reservaSeleccion = {};        // { idProducto: { nombre, cantidad } }

/* ============================================================
   HERO / CARRUSEL
============================================================ */
function setHeroImage() {
  const hero = document.getElementById("hero");
  if (!hero) return;

  hero.style.backgroundImage = `url('${heroImages[heroIndex]}')`;

  const dots = document.getElementById("hero-dots");
  if (!dots) return;

  dots.innerHTML = "";

  heroImages.forEach((_, idx) => {
    const d = document.createElement("button");
    d.className = "hero-dot" + (idx === heroIndex ? " active" : "");
    d.onclick = () => {
      heroIndex = idx;
      setHeroImage();
    };
    dots.appendChild(d);
  });
}

function nextHero() {
  heroIndex = (heroIndex + 1) % heroImages.length;
  setHeroImage();
}

/* ============================================================
   MENÚ LATERAL
============================================================ */
function openMenu() {
  const menu = document.getElementById("sideMenu");
  if (!menu) return;
  menu.classList.add("open");
}
function closeMenu() {
  const menu = document.getElementById("sideMenu");
  if (!menu) return;
  menu.classList.remove("open");
}

window.openMenu = openMenu;
window.closeMenu = closeMenu;

/* ============================================================
   BOTONES HERO (RETIRAR / DELIVERY / RESERVA)
============================================================ */
function pedirRetirar() {
  localStorage.setItem("tipoPedido", "retiroLocal");
  abrirPopupCategorias();
}

function irDelivery() {
  localStorage.setItem("tipoPedido", "delivery");
  abrirPopupCategorias();
}

function irReservas() {
  abrirPopupReserva();
}

window.pedirRetirar = pedirRetirar;
window.irDelivery = irDelivery;
window.irReservas = irReservas;

/* ============================================================
   CATEGORÍAS (CLIENTE) - POPUP MENÚ
============================================================ */
async function cargarCategoriasCliente() {
  try {
    const res = await fetch("/categories");
    const data = await res.json();

    categoriasCliente = data
      .filter((c) => c.tipo === "cliente" && c.visible !== 0)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    renderPopupCategorias();
  } catch (err) {
    console.error("Error cargando categorías:", err);
  }
}

function renderPopupCategorias() {
  const cont = document.getElementById("popupCategoriasLista");
  if (!cont) return;

  cont.innerHTML = "";

  categoriasCliente.forEach((cat) => {
    const div = document.createElement("div");
    div.className = "categoria-popup-card";
    div.onclick = () => abrirPopupProductos(cat);

    div.innerHTML = `
      <img src="${cat.image || "logo_palacio.jpg"}" alt="${cat.nombre}">
      <span>${cat.nombre}</span>
    `;

    cont.appendChild(div);
  });
}

function abrirPopupCategorias() {
  const pop = document.getElementById("popupCategorias");
  if (pop) pop.style.display = "flex";
}

function cerrarPopupCategorias() {
  const pop = document.getElementById("popupCategorias");
  if (pop) pop.style.display = "none";
}

window.abrirPopupCategorias = abrirPopupCategorias;
window.cerrarPopupCategorias = cerrarPopupCategorias;

/* ============================================================
   PRODUCTOS POR CATEGORÍA (POPUP PRODUCTOS)
============================================================ */
async function abrirPopupProductos(cat) {
  cerrarPopupCategorias();

  const titulo = document.getElementById("popupProductosTitulo");
  const lista = document.getElementById("popupProductosLista");
  const pop = document.getElementById("popupProductos");

  if (!lista || !pop) return;

  if (titulo) titulo.textContent = cat.nombre;
  lista.innerHTML = "Cargando…";
  pop.style.display = "flex";

  try {
    const res = await fetch(
      `/products?categoria=${encodeURIComponent(cat.nombre)}`
    );
    const productos = await res.json();
    renderPopupProductos(productos);
  } catch (err) {
    console.error("Error cargando productos:", err);
    lista.innerHTML = "<p>Error cargando productos.</p>";
  }
}

function renderPopupProductos(lista) {
  const cont = document.getElementById("popupProductosLista");
  if (!cont) return;

  cont.innerHTML = "";

  if (!lista.length) {
    cont.innerHTML = "<p>No hay productos en esta categoría.</p>";
    return;
  }

  lista.forEach((p) => {
    const div = document.createElement("div");
    div.className = "producto-popup-card";

    const nombreEscapado = p.name.replace(/'/g, "\\'");

    div.innerHTML = `
      <img src="${p.image || "logo_palacio.jpg"}" alt="${p.name}">
      <div class="producto-info">
        <div class="producto-nombre">${p.name}</div>
        <div class="producto-descripcion">${p.description || ""}</div>
        <div class="producto-precio">$${p.price}</div>
        <button class="btn-agregar"
          onclick="agregarAlCarrito(${p.id}, '${nombreEscapado}', ${p.price})">
          Agregar
        </button>
      </div>
    `;

    cont.appendChild(div);
  });
}

function volverACategorias() {
  cerrarPopupProductos();
  abrirPopupCategorias();
}

function cerrarPopupProductos() {
  const pop = document.getElementById("popupProductos");
  if (pop) pop.style.display = "none";
}

window.volverACategorias = volverACategorias;
window.cerrarPopupProductos = cerrarPopupProductos;

/* ============================================================
   CARRITO (POPUP LATERAL)
============================================================ */
function abrirPopupCarrito() {
  const pop = document.getElementById("popupCarrito");
  if (!pop) return;

  pop.classList.add("abierto");
  renderPopupCarrito();
}

function cerrarPopupCarrito() {
  const pop = document.getElementById("popupCarrito");
  if (!pop) return;
  pop.classList.remove("abierto");
}

window.abrirPopupCarrito = abrirPopupCarrito;
window.cerrarPopupCarrito = cerrarPopupCarrito;

function agregarAlCarrito(id, nombre, precio) {
  const item = carrito.find((i) => i.id === id);
  if (item) item.cantidad++;
  else carrito.push({ id, nombre, precio, cantidad: 1 });

  guardarCarrito();
  abrirPopupCarrito();
}

window.agregarAlCarrito = agregarAlCarrito;

// promos -> carrito
function agregarAlCarritoPromo(nombre, precio) {
  carrito.push({
    id: "promo-" + Date.now(),
    nombre,
    precio,
    cantidad: 1,
  });

  guardarCarrito();
  abrirPopupCarrito();
}
window.agregarAlCarritoPromo = agregarAlCarritoPromo;

function renderPopupCarrito() {
  const cont = document.getElementById("popupCarritoItems");
  const totalEl = document.getElementById("popupCarritoTotal");
  if (!cont || !totalEl) return;

  cont.innerHTML = "";
  let total = 0;

  if (!carrito.length) {
    cont.innerHTML = "<p>Tu carrito está vacío.</p>";
    totalEl.textContent = "0";
    return;
  }

  carrito.forEach((p, index) => {
    const sub = (p.precio || 0) * (p.cantidad || 1);
    total += sub;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <span>${p.nombre}</span>
      <div class="cart-controls">
        <button class="cart-btn" onclick="bajarCantidad(${index})">−</button>
        <span class="cart-cant">${p.cantidad}</span>
        <button class="cart-btn" onclick="subirCantidad(${index})">+</button>
        <span class="cart-subtotal">$${sub}</span>
        <button class="cart-delete" onclick="eliminarProductoCarrito(${index})">🗑</button>
      </div>
    `;

    cont.appendChild(div);
  });

  totalEl.textContent = total;
}

function subirCantidad(i) {
  if (!carrito[i]) return;
  carrito[i].cantidad++;
  guardarCarrito();
}
function bajarCantidad(i) {
  if (!carrito[i]) return;
  carrito[i].cantidad--;
  if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
  guardarCarrito();
}
function eliminarProductoCarrito(i) {
  if (!carrito[i]) return;
  carrito.splice(i, 1);
  guardarCarrito();
}

function guardarCarrito() {
  localStorage.setItem("cart", JSON.stringify(carrito));
  renderPopupCarrito();
}

window.subirCantidad = subirCantidad;
window.bajarCantidad = bajarCantidad;
window.eliminarProductoCarrito = eliminarProductoCarrito;

/* ============================================================
   FINALIZAR PEDIDO
============================================================ */
function finalizarPedidoDesdeCarrito() {
  if (!carrito.length) {
    alert("El carrito está vacío.");
    return;
  }

  const tipo = localStorage.getItem("tipoPedido");

  if (tipo === "delivery") {
    window.location.href = "checkout_delivery.html";
    return;
  }

  if (tipo === "retiroLocal") {
    abrirPopupRetiro();
    return;
  }

  alert("Primero elegí si es para Retirar o Delivery.");
}

window.finalizarPedidoDesdeCarrito = finalizarPedidoDesdeCarrito;

/* ============================================================
   PROMOS (CLIENTE)
============================================================ */
async function cargarPromosCliente() {
  const cont = document.getElementById("promo-lista");
  if (!cont) return;

  try {
    const res = await fetch("/promos");
    const data = await res.json();

    cont.innerHTML = "";

    if (!data.length) {
      cont.innerHTML = "<p>Por ahora no hay promociones activas.</p>";
      return;
    }

    data.forEach((p) => {
      const div = document.createElement("div");
      div.className = "promo-card";

      const nombreEsc = p.title.replace(/'/g, "\\'");

      div.innerHTML = `
        ${p.image ? `<img src="${p.image}" alt="${p.title}">` : ""}
        <h3>${p.title}</h3>
        <p>${p.description || ""}</p>
        ${p.price ? `<strong>$${p.price}</strong>` : ""}
        ${
          p.price
            ? `<button class="btn-agregar"
                onclick="agregarAlCarritoPromo('${nombreEsc}', ${p.price})">
                Agregar
               </button>`
            : ""
        }
      `;

      cont.appendChild(div);
    });
  } catch (err) {
    console.error("Error cargando promos:", err);
    cont.innerHTML = "<p>Error cargando promociones.</p>";
  }
}

/* ============================================================
   CARRUSEL FOTOS LOCAL (DERECHA)
============================================================ */
let carruselIndex = 0;

function cambiarFotoDerecha() {
  const fotos = document.querySelectorAll(".foto-carrusel");
  if (!fotos.length) return;

  fotos.forEach((f) => f.classList.remove("active"));
  carruselIndex = (carruselIndex + 1) % fotos.length;
  fotos[carruselIndex].classList.add("active");
}

/* ============================================================
   POPUP RETIRO EN LOCAL
============================================================ */
function abrirPopupRetiro() {
  const pop = document.getElementById("popupRetiro");
  if (!pop) return;

  pop.style.display = "flex";
  pop.classList.add("popup-ret-show");
}

function cerrarPopupRetiro() {
  const pop = document.getElementById("popupRetiro");
  if (!pop) return;

  pop.classList.remove("popup-ret-show");
  pop.style.display = "none";
}

window.abrirPopupRetiro = abrirPopupRetiro;
window.cerrarPopupRetiro = cerrarPopupRetiro;

async function confirmarRetiro() {
  const nombre = document.getElementById("retiroNombre").value.trim();
  const telefono = document.getElementById("retiroTelefono").value.trim();
  const hora = document.getElementById("retiroHora").value.trim();

  if (!nombre || !telefono || !hora) {
    alert("Completá todos los datos.");
    return;
  }

  const telLimpio = telefono.replace(/\D/g, "");
  if (telLimpio.length < 8) {
    alert("Revisá el teléfono (muy corto).");
    return;
  }

  const total = carrito.reduce(
    (t, p) => t + (p.precio || 0) * (p.cantidad || 1),
    0
  );

  const body = {
    nombre,
    telefono: telLimpio,
    carrito,
    total,
    formaPago: "efectivo",
    horaEntrega: hora,
    tipo: "retiro_local",
  };

  try {
    const res = await fetch("/pedidos/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      console.error(data);
      alert("Hubo un problema guardando tu pedido. Probá de nuevo.");
      return;
    }

    carrito = [];
    localStorage.removeItem("cart");

    alert("¡Pedido confirmado! Te esperamos en el local 🙌");

    cerrarPopupRetiro();
    cerrarPopupCarrito();
  } catch (e) {
    console.error("Error enviando pedido local:", e);
    alert("Hubo un problema con la conexión.");
  }
}

window.confirmarRetiro = confirmarRetiro;

/* ============================================================
   POPUP RESERVAS - FORMULARIO PÚBLICO
============================================================ */

// abrir desde botón "Reserva" del hero / caja lateral
function abrirPopupReserva() {
  const pop = document.getElementById("popupReserva");
  if (!pop) return;

  // reseteamos formulario
  document.getElementById("reservaForm").reset();
  document.getElementById("resProvincia").value = "";
  const msg = document.getElementById("reservaMsg");
  msg.style.display = "none";
  msg.textContent = "";

  document.getElementById("reservaResumen").innerHTML =
    "<p>Seleccioná una categoría y agregá cantidades.</p>";

  reservaSeleccion = {};

  cargarProductosReserva();
  pop.style.display = "flex";
}

function cerrarPopupReserva() {
  const pop = document.getElementById("popupReserva");
  if (!pop) return;
  pop.style.display = "none";
}

window.abrirPopupReserva = abrirPopupReserva;
window.cerrarPopupReserva = cerrarPopupReserva;

// ======================================
// CARGAR PRODUCTOS PARA RESERVA
// ======================================
async function cargarProductosReserva() {
  const selectCat = document.getElementById("reservaCategoriaSelect");
  const cont = document.getElementById("reservaProductosList");

  if (!selectCat || !cont) return;

  selectCat.innerHTML = "";
  cont.innerHTML = "Cargando...";

  try {
    const r = await fetch("/reservas/productos");
    const data = await r.json();

    // data = [{id, name}]
    reservaProductosLista = data || [];

    // Por ahora solo "todos" (no hay categorías separadas desde el backend)
    selectCat.innerHTML = `<option value="todos">Todos los productos</option>`;
    selectCat.value = "todos";

    renderListaProductosReserva();
  } catch (e) {
    console.error("Error cargando productos de reserva:", e);
    cont.innerHTML = "<p>Error cargando productos.</p>";
  }
}

// ======================================
// RENDERIZAR LISTA DE PRODUCTOS
// ======================================
function renderListaProductosReserva() {
  const cont = document.getElementById("reservaProductosList");
  if (!cont) return;

  cont.innerHTML = "";

  if (!reservaProductosLista.length) {
    cont.innerHTML = "<p>No hay productos configurados para reservas.</p>";
    return;
  }

  reservaProductosLista.forEach((p) => {
    const cant = reservaSeleccion[p.id]?.cantidad || 0;

    const div = document.createElement("div");
    div.className = "producto-item";

    div.innerHTML = `
      <span>${p.name}</span>
      <input type="number" min="0" value="${cant}" data-id="${p.id}">
    `;

    const input = div.querySelector("input");
    input.addEventListener("input", () => {
      let v = parseInt(input.value || "0", 10);
      if (isNaN(v) || v < 0) v = 0;
      input.value = v;

      reservaSeleccion[p.id] = {
        nombre: p.name,
        cantidad: v,
      };

      actualizarResumenReserva();
    });

    cont.appendChild(div);
  });

  actualizarResumenReserva();
}

// ======================================
// RESUMEN VISUAL DE PRODUCTOS ELEGIDOS
// ======================================
function actualizarResumenReserva() {
  const cont = document.getElementById("reservaResumen");
  if (!cont) return;

  const items = Object.values(reservaSeleccion).filter((i) => i.cantidad > 0);

  if (!items.length) {
    cont.innerHTML = "<p>Seleccioná productos y cantidades.</p>";
    return;
  }

  let html = "<ul>";
  items.forEach((i) => {
    html += `<li>${i.nombre}: ${i.cantidad} u.</li>`;
  });
  html += "</ul>";

  cont.innerHTML = html;
}

// ======================================
// AUTOCOMPLETAR PROVINCIA POR CÓDIGO POSTAL
// ======================================
async function autocompletarProvinciaReservaPublica() {
  const cpEl = document.getElementById("resCP");
  const provEl = document.getElementById("resProvincia");
  if (!cpEl || !provEl) return;

  const cp = cpEl.value.trim();
  if (!cp) {
    provEl.value = "";
    return;
  }

  try {
    const resp = await fetch(
      `https://apis.datos.gob.ar/georef/api/codigos_postales?codigo_postal=${encodeURIComponent(
        cp
      )}`
    );
    const data = await resp.json();

    if (data && data.codigos_postales && data.codigos_postales.length > 0) {
      provEl.value = data.codigos_postales[0].provincia.nombre || "";
    } else {
      provEl.value = "";
    }
  } catch (e) {
    console.error("Error autocompletando provincia:", e);
    provEl.value = "";
  }
}

// Vinculamos blur del CP
const cpReservaInput = document.getElementById("resCP");
if (cpReservaInput) {
  cpReservaInput.addEventListener("blur", autocompletarProvinciaReservaPublica);
}

// ======================================
// ENVIAR RESERVA AL BACKEND
// ======================================
async function confirmarReservaPublica() {
  const msg = document.getElementById("reservaMsg");
  msg.style.display = "none";
  msg.textContent = "";

  const nombre = document.getElementById("resNombre").value.trim();
  const apellido = document.getElementById("resApellido").value.trim();
  const telefono = document.getElementById("resTelefono").value.trim();
  const codigo_postal = document.getElementById("resCP").value.trim();
  const provincia = document.getElementById("resProvincia").value.trim();
  const domicilio = document.getElementById("resDomicilio").value.trim();
  const ciudad = document.getElementById("resCiudad").value.trim();
  const fecha_reserva = document.getElementById("resFecha").value;
  const hora = document.getElementById("resHora").value;
  const tipo_evento = document.getElementById("resTipoEvento").value.trim();

  if (!nombre || !apellido || !telefono || !fecha_reserva || !hora) {
    msg.textContent =
      "Completá nombre, apellido, teléfono, fecha de reserva y hora.";
    msg.className = "mensaje error";
    msg.style.display = "block";
    return;
  }

  const telLimpio = telefono.replace(/\D/g, "");
  if (telLimpio.length < 8) {
    msg.textContent = "Revisá el teléfono (muy corto).";
    msg.className = "mensaje error";
    msg.style.display = "block";
    return;
  }

  const productos = Object.values(reservaSeleccion).filter(
    (p) => p.cantidad > 0
  );

  if (!productos.length) {
    msg.textContent = "Elegí al menos 1 producto con cantidad.";
    msg.className = "mensaje error";
    msg.style.display = "block";
    return;
  }

  const body = {
    nombre,
    apellido,
    telefono: telLimpio,
    codigo_postal,
    provincia,
    domicilio,
    ciudad,
    fecha_reserva,
    hora,
    tipo_evento,
    productos,
  };

  try {
    const r = await fetch("/reservas/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      console.error("Error HTTP al enviar reserva:", r.status);
      throw new Error("Error HTTP");
    }

    msg.textContent = `Hola ${nombre}, en breve te enviaremos por WhatsApp el presupuesto de tu reserva. ¡Gracias por elegirnos! 🥪`;
    msg.className = "mensaje ok";
    msg.style.display = "block";

    // limpiamos productos seleccionados
    reservaSeleccion = {};
    actualizarResumenReserva();
  } catch (e) {
    console.error("Error enviando reserva:", e);
    msg.textContent = "Hubo un error al enviar la reserva. Probá de nuevo.";
    msg.className = "mensaje error";
    msg.style.display = "block";
  }
}

window.confirmarReservaPublica = confirmarReservaPublica;

/* ============================================================
   INICIO
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  setHeroImage();
  setInterval(nextHero, 6000);

  cargarCategoriasCliente();
  cargarPromosCliente();

  cambiarFotoDerecha();
  setInterval(cambiarFotoDerecha, 5000);

  const year = document.getElementById("anio");
  if (year) year.textContent = new Date().getFullYear();
});
