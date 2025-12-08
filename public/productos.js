// ========================
// VALIDAR LOGIN
// ========================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

function goBack() {
  window.location.href = "admin.html";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ========================
// CARGAR CATEGORÍAS (producto + reserva)
// ========================
async function cargarCategoriasDisponible() {
  try {
    const res = await fetch("/categories");
    const data = await res.json();

    const cont = document.getElementById("catButtonsContainer");
    cont.innerHTML = "";

    data.forEach((cat) => {
      const b = document.createElement("span");
      b.className = "cat-btn";
      b.dataset.value = cat.nombre;
      b.dataset.tipo = cat.tipo;
      b.textContent = `${cat.nombre} (${cat.tipo})`;
      cont.appendChild(b);
    });

    setupCategoryButtons();
  } catch (e) {
    console.error("Error cargando categorías", e);
  }
}

// ========================
// BOTONES CATEGORIA
// ========================
function setupCategoryButtons() {
  const buttons = document.querySelectorAll(".cat-btn");
  const inputCat = document.getElementById("prod_category");
  const inputTipo = document.getElementById("prod_category_tipo");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      inputCat.value = btn.dataset.value;
      inputTipo.value = btn.dataset.tipo;

      actualizarCamposPorTipo(btn.dataset.tipo);
    });
  });
}

function actualizarCamposPorTipo(tipo) {
  const precioBox = document.getElementById("campoPrecio");
  const stockBox = document.getElementById("campoStock");
  const alertaBox = document.getElementById("campoAlerta");

  if (tipo === "reserva") {
    precioBox.style.display = "none";
    stockBox.style.display = "none";
    alertaBox.style.display = "none";
  } else {
    precioBox.style.display = "block";
    stockBox.style.display = "block";
    alertaBox.style.display = "block";
  }
}

// ========================
// CARGAR PRODUCTOS
// ========================
async function cargarProductos() {
  const res = await fetch("/products");
  const data = await res.json();

  const tbody = document.querySelector("#tablaProductos tbody");
  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.image ? `<img src="${p.image}" width="60">` : ""}</td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.category_tipo === "reserva" ? "—" : "$" + p.price}</td>
      <td>${p.category_tipo === "reserva" ? "—" : p.stock}</td>
      <td>${p.description || ""}</td>
      <td>
        <button onclick="editarProducto(${p.id})">Editar</button>
        <button class="eliminar" onclick="eliminarProducto(${p.id})">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ========================
// GUARDAR PRODUCTO
// ========================
document.getElementById("form-producto").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("prod_id").value;
  const name = document.getElementById("prod_name").value;
  const price = +document.getElementById("prod_price").value;
  const desc = document.getElementById("prod_desc").value;
  const category = document.getElementById("prod_category").value;
  const tipo = document.getElementById("prod_category_tipo").value;

  const stock = +document.getElementById("prod_stock").value;
  const alertStock = +document.getElementById("prod_alert").value;

  const imgFile = document.getElementById("prod_image").files[0];

  const msg = document.getElementById("msgForm");
  msg.textContent = "";
  msg.className = "mensaje";

  if (!category) {
    msg.textContent = "Seleccioná una categoría.";
    msg.className = "mensaje error";
    return;
  }

  let imageUrl = null;

  if (imgFile) {
    const fd = new FormData();
    fd.append("file", imgFile);

    const up = await fetch("/upload", { method: "POST", body: fd });
    const d = await up.json();
    imageUrl = d.url;
  }

  const body = {
    name,
    description: desc,
    category,
    category_tipo: tipo,
  };

  if (tipo === "producto") {
    body.price = price;
    body.stock = stock;
    body.stock_alert = alertStock;
  } else {
    body.price = null;
    body.stock = null;
    body.stock_alert = null;
  }

  if (imageUrl) body.image = imageUrl;

  const method = id ? "PUT" : "POST";
  const url = id ? `/products/${id}` : "/products";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    msg.textContent = "Error guardando el producto";
    msg.className = "mensaje error";
    return;
  }

  msg.textContent = id ? "Producto actualizado" : "Producto creado";
  msg.className = "mensaje ok";

  resetForm();
  cargarProductos();
});

// ========================
// EDITAR PRODUCTO
// ========================
async function editarProducto(id) {
  const res = await fetch(`/products/${id}`);
  const p = await res.json();

  document.getElementById("prod_id").value = p.id;
  document.getElementById("prod_name").value = p.name;
  document.getElementById("prod_desc").value = p.description;

  document.getElementById("prod_category").value = p.category;
  document.getElementById("prod_category_tipo").value = p.category_tipo;

  actualizarCamposPorTipo(p.category_tipo);

  if (p.category_tipo === "producto") {
    document.getElementById("prod_price").value = p.price;
    document.getElementById("prod_stock").value = p.stock;
    document.getElementById("prod_alert").value = p.stock_alert;
  }

  marcarCategoriaActiva(p.category);
}

// ========================
// ELIMINAR PRODUCTO
// ========================
async function eliminarProducto(id) {
  if (!confirm("¿Eliminar este producto?")) return;

  await fetch(`/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  cargarProductos();
}

// ========================
// RESET FORM
// ========================
function resetForm() {
  document.getElementById("form-producto").reset();
  document.getElementById("prod_id").value = "";
  document.getElementById("prod_category").value = "";
  document.getElementById("prod_category_tipo").value = "";
}

// ========================
// INICIO
// ========================
document.addEventListener("DOMContentLoaded", () => {
  cargarCategoriasDisponible();
  cargarProductos();
});

window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.goBack = goBack;
window.logout = logout;
window.resetForm = resetForm;
