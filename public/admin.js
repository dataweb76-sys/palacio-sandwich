// ======================= AUTH / TOKEN =======================
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/login.html";
}
const AUTH_HEADER = { Authorization: "Bearer " + token };

// Logout
document.getElementById("btn-logout").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

// ======================= MODO OSCURO =======================
const btnDark = document.getElementById("btn-dark");
const darkSaved = localStorage.getItem("admin-dark") === "1";
if (darkSaved) document.body.classList.add("dark");

btnDark.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "admin-dark",
    document.body.classList.contains("dark") ? "1" : "0"
  );
});

// ======================= SUBIDA DE IMAGEN PRODUCTO =======================
document.getElementById("btn-subir-img").onclick = () => {
  document.getElementById("imagen-file").click();
};

let imagenSubidaURL = null;

document
  .getElementById("imagen-file")
  .addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    document.getElementById("nombre-imagen").textContent = file.name;

    const formData = new FormData();
    formData.append("imagen", file);

    const res = await fetch("/upload", {
      method: "POST",
      headers: AUTH_HEADER,
      body: formData,
    });

    if (res.status === 401) return tokenExpirado();

    const data = await res.json();

    if (data.url) {
      imagenSubidaURL = data.url;
      const preview = document.getElementById("preview");
      preview.src = data.url;
      preview.style.display = "block";
    }
  });

// ======================= SUBIDA DE IMAGEN PROMO =======================
document.getElementById("btn-subir-img-promo").onclick = () => {
  document.getElementById("promo-img-file").click();
};

let promoImagenURL = null;

document
  .getElementById("promo-img-file")
  .addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    document.getElementById("promo-img-nombre").textContent = file.name;

    const formData = new FormData();
    formData.append("imagen", file);

    const res = await fetch("/upload", {
      method: "POST",
      headers: AUTH_HEADER,
      body: formData,
    });

    if (res.status === 401) return tokenExpirado();

    const data = await res.json();

    if (data.url) {
      promoImagenURL = data.url;
      const preview = document.getElementById("promo-preview");
      preview.src = data.url;
      preview.style.display = "block";
    }
  });

// ======================= CACHES =======================
let productosCache = [];
let promosCache = [];

// ======================= PRODUCTOS =======================
async function cargarProductos() {
  const res = await fetch("/products");
  const productos = await res.json();
  productosCache = productos;

  document.getElementById("tabla-productos").innerHTML = productos
    .map((p) => {
      let claseStock = "";
      if (p.stock === 0) claseStock = "sin-stock";
      else if (
        p.stock !== null &&
        p.stock !== undefined &&
        p.stock <= (p.stock_alert || 2)
      )
        claseStock = "stock-bajo";

      return `
        <tr class="${claseStock}">
          <td>${p.id}</td>
          <td>${p.image ? `<img src="${p.image}" width="80">` : ""}</td>
          <td>${p.name}</td>
          <td>${p.category || ""}</td>
          <td>${p.stock != null ? p.stock : ""}</td>
          <td>${p.description || ""}</td>
          <td>$${p.price}</td>
          <td>
            <button onclick="editarProducto(${p.id})">Editar</button>
            <button onclick="venderUno(${p.id})" class="secundario">Vender 1</button>
            <button onclick="eliminarProducto(${p.id})" class="eliminar">Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  actualizarDashboard();
}

cargarProductos();

document.getElementById("form-producto").onsubmit = async function (e) {
  e.preventDefault();

  const id = document.getElementById("producto-id").value;
  const data = {
    name: document.getElementById("nombre").value,
    price: document.getElementById("precio").value,
    description: document.getElementById("descripcion").value,
    category: document.getElementById("categoria").value,
    stock: document.getElementById("stock").value,
    stock_alert: document.getElementById("stock_alert").value,
    image: imagenSubidaURL,
  };

  const res = await fetch(id ? `/products/${id}` : "/products", {
    method: id ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...AUTH_HEADER,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) return tokenExpirado();

  alert("Producto guardado");
  imagenSubidaURL = null;
  document.getElementById("form-producto").reset();
  document.getElementById("preview").style.display = "none";
  document.getElementById("cancelar-edicion").style.display = "none";
  cargarProductos();
};

window.editarProducto = function (id) {
  const p = productosCache.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("producto-id").value = p.id;
  document.getElementById("nombre").value = p.name;
  document.getElementById("precio").value = p.price;
  document.getElementById("descripcion").value = p.description || "";
  document.getElementById("categoria").value = p.category || "";
  document.getElementById("stock").value = p.stock != null ? p.stock : 0;
  document.getElementById("stock_alert").value =
    p.stock_alert != null ? p.stock_alert : 2;

  imagenSubidaURL = p.image;
  if (p.image) {
    const preview = document.getElementById("preview");
    preview.src = p.image;
    preview.style.display = "block";
  }

  document.getElementById("cancelar-edicion").style.display = "inline-block";
};

window.eliminarProducto = async function (id) {
  if (!confirm("¿Eliminar producto?")) return;

  const res = await fetch(`/products/${id}`, {
    method: "DELETE",
    headers: AUTH_HEADER,
  });

  if (res.status === 401) return tokenExpirado();

  cargarProductos();
};

window.venderUno = async function (id) {
  const res = await fetch(`/products/sell/${id}`, {
    method: "POST",
    headers: AUTH_HEADER,
  });

  if (res.status === 401) return tokenExpirado();

  const data = await res.json();

  if (data.error) {
    alert(data.error);
  } else {
    if (data.alerta === "STOCK BAJO") {
      alert("⚠️ Quedan pocas unidades de este producto.");
    }
    if (data.alerta === "SIN STOCK") {
      alert("❌ ESTE PRODUCTO SE QUEDÓ SIN STOCK");
    }
  }

  await cargarProductos();
  await cargarVentas();
};

document.getElementById("cancelar-edicion").onclick = () => {
  document.getElementById("form-producto").reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("preview").style.display = "none";
  imagenSubidaURL = null;
  document.getElementById("cancelar-edicion").style.display = "none";
};

// ======================= PROMOS =======================
async function cargarPromos() {
  const res = await fetch("/promos");
  const promos = await res.json();
  promosCache = promos;

  document.getElementById("tabla-promos").innerHTML = promos
    .map(
      (p) => `
        <tr>
          <td>${p.id}</td>
          <td>${p.image ? `<img src="${p.image}" width="80">` : ""}</td>
          <td>${p.title}</td>
          <td>$${p.price || 0}</td>
          <td>${p.description || ""}</td>
          <td>
            <button onclick="editarPromo(${p.id})">Editar</button>
            <button onclick="eliminarPromo(${p.id})" class="eliminar">Eliminar</button>
          </td>
        </tr>
      `
    )
    .join("");

  actualizarDashboard();
}

cargarPromos();

document.getElementById("form-promo").onsubmit = async function (e) {
  e.preventDefault();

  const id = document.getElementById("promo-id").value;
  const data = {
    title: document.getElementById("promo-titulo").value,
    description: document.getElementById("promo-descripcion").value,
    price: document.getElementById("promo-precio").value,
    image: promoImagenURL,
  };

  const res = await fetch(id ? `/promos/${id}` : "/promos", {
    method: id ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...AUTH_HEADER,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) return tokenExpirado();

  alert("Promoción guardada");
  document.getElementById("form-promo").reset();
  document.getElementById("cancelar-promo").style.display = "none";
  document.getElementById("promo-preview").style.display = "none";
  promoImagenURL = null;
  cargarPromos();
};

window.editarPromo = function (id) {
  const p = promosCache.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("promo-id").value = p.id;
  document.getElementById("promo-titulo").value = p.title;
  document.getElementById("promo-descripcion").value = p.description || "";
  document.getElementById("promo-precio").value = p.price || 0;

  promoImagenURL = p.image;
  if (p.image) {
    const preview = document.getElementById("promo-preview");
    preview.src = p.image;
    preview.style.display = "block";
  }

  document.getElementById("cancelar-promo").style.display =
    "inline-block";
};

window.eliminarPromo = async function (id) {
  if (!confirm("¿Eliminar promoción?")) return;

  const res = await fetch(`/promos/${id}`, {
    method: "DELETE",
    headers: AUTH_HEADER,
  });

  if (res.status === 401) return tokenExpirado();

  cargarPromos();
};

document.getElementById("cancelar-promo").onclick = () => {
  document.getElementById("form-promo").reset();
  document.getElementById("promo-id").value = "";
  document.getElementById("promo-preview").style.display = "none";
  promoImagenURL = null;
};

// ======================= CAMBIO DE CONTRASEÑA =======================
document.getElementById("form-pass").onsubmit = async function (e) {
  e.preventDefault();

  const currentPass = document.getElementById("pass-actual").value;
  const newPass = document.getElementById("pass-nueva").value;
  const msg = document.getElementById("mensaje-pass");
  msg.textContent = "";

  const res = await fetch("/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...AUTH_HEADER,
    },
    body: JSON.stringify({ currentPass, newPass }),
  });

  if (res.status === 401) return tokenExpirado();

  const data = await res.json();

  if (data.error) {
    msg.textContent = data.error;
    msg.className = "mensaje error";
  } else {
    msg.textContent = data.message;
    msg.className = "mensaje ok";
    document.getElementById("form-pass").reset();
  }
};

// ======================= VENTAS =======================
async function cargarVentas() {
  const res = await fetch("/ventas", { headers: AUTH_HEADER });
  if (res.status === 401) return tokenExpirado();
  const ventas = await res.json();
  renderVentas(ventas);
}

function renderVentas(lista) {
  document.getElementById("tabla-ventas").innerHTML = lista
    .map(
      (v) => `
        <tr>
          <td>${v.id}</td>
          <td>${v.fecha}</td>
          <td>${v.producto_nombre}</td>
          <td>${v.cantidad}</td>
          <td>$${v.precio_unitario}</td>
          <td><strong>$${v.precio_total}</strong></td>
        </tr>
      `
    )
    .join("");
}

async function filtrarDia() {
  const dia = document.getElementById("filtro-dia").value;
  if (!dia) return;
  const res = await fetch(`/ventas/fecha/${dia}`, { headers: AUTH_HEADER });
  if (res.status === 401) return tokenExpirado();
  const lista = await res.json();
  renderVentas(lista);
}

async function filtrarMes() {
  const mes = document.getElementById("filtro-mes").value;
  if (!mes) return;
  const res = await fetch(`/ventas/mes/${mes}`, { headers: AUTH_HEADER });
  if (res.status === 401) return tokenExpirado();
  const lista = await res.json();
  renderVentas(lista);
}

window.filtrarDia = filtrarDia;
window.filtrarMes = filtrarMes;

cargarVentas();

// ======================= CONFIGURACIÓN DE ENVÍOS =======================
async function cargarConfigEnvios() {
  const msg = document.getElementById("mensaje-envio");
  msg.textContent = "";
  try {
    const res = await fetch("/config", { headers: AUTH_HEADER });
    const cfg = await res.json();
    document.getElementById("envio_costo").value = cfg.envio_costo || 0;
    document.getElementById("envio_gratis_desde").value =
      cfg.envio_gratis_desde || 0;
  } catch (e) {
    console.error(e);
    msg.textContent = "No se pudo cargar la configuración";
    msg.className = "mensaje error";
  }
}

document.getElementById("form-envios").onsubmit = async function (e) {
  e.preventDefault();
  const msg = document.getElementById("mensaje-envio");
  msg.textContent = "";

  const envio_costo = document.getElementById("envio_costo").value;
  const envio_gratis_desde =
    document.getElementById("envio_gratis_desde").value;

  try {
    const res = await fetch("/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...AUTH_HEADER,
      },
      body: JSON.stringify({ envio_costo, envio_gratis_desde }),
    });

    if (res.status === 401) return tokenExpirado();
    await res.json();
    msg.textContent = "Configuración guardada";
    msg.className = "mensaje ok";
  } catch (e) {
    console.error(e);
    msg.textContent = "Error guardando configuración";
    msg.className = "mensaje error";
  }
};

cargarConfigEnvios();

// ======================= DASHBOARD =======================
function actualizarDashboard() {
  const totalProd = productosCache.length;
  const totalPromos = promosCache.length;
  let ultimo = "-";
  let stockBajo = 0;

  if (productosCache.length > 0) {
    const ordenados = [...productosCache].sort((a, b) => b.id - a.id);
    ultimo = ordenados[0].name;

    stockBajo = productosCache.filter((p) => {
      if (p.stock == null) return false;
      if (p.stock === 0) return true;
      return p.stock <= (p.stock_alert || 2);
    }).length;
  }

  document.getElementById("stat-productos").textContent = totalProd;
  document.getElementById("stat-promos").textContent = totalPromos;
  document.getElementById("stat-ultimo").textContent = ultimo;
  document.getElementById("stat-stock-bajo").textContent = stockBajo;
}

// ======================= TOKEN EXPIRADO =======================
function tokenExpirado() {
  alert("Tu sesión expiró. Volvé a iniciar sesión.");
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}
