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
// DÓLAR PARA CONVERTIR ARS → USD
// ========================
let dolarPromo = 1000;

async function cargarDolarPromo() {
  try {
    const res = await fetch("https://api.bluelytics.com.ar/v2/latest");
    const data = await res.json();
    dolarPromo = data.blue.value_avg;
  } catch (e) {
    console.warn("No se pudo obtener dólar para promos, usando valor por defecto 1000.");
  }
}
cargarDolarPromo();

// Actualizar campo USD cuando cambia ARS
document.addEventListener("DOMContentLoaded", () => {
  const priceInput = document.getElementById("promo_price");
  if (priceInput) {
    priceInput.addEventListener("input", () => {
      const ars = +priceInput.value;
      document.getElementById("promo_price_usd").value = ars
        ? (ars / dolarPromo).toFixed(2) + " USD"
        : "";
    });
  }

  cargarPromos();
});

// ========================
// MODAL
// ========================
function openPromoModal() {
  document.getElementById("promoModal").classList.remove("hidden");
  document.getElementById("promoModalTitulo").textContent = "Nueva Promoción";
  document.getElementById("msgPromo").textContent = "";
  document.getElementById("msgPromo").className = "mensaje";
  resetPromoForm();
}

function closePromoModal() {
  document.getElementById("promoModal").classList.add("hidden");
}

function resetPromoForm() {
  document.getElementById("promo_id").value = "";
  document.getElementById("promo_title").value = "";
  document.getElementById("promo_price").value = "";
  document.getElementById("promo_price_usd").value = "";
  document.getElementById("promo_desc").value = "";
  document.getElementById("promo_categoria").value = "";
  document.getElementById("promo_image").value = "";
}

// ========================
// CARGAR CATEGORÍAS (SOLO TIPO 'promocion')
// ========================
async function cargarCategoriasPromo() {
  try {
    const res = await fetch("/categories");
    const cats = await res.json();

    const lista = document.getElementById("listaCategoriasPromo");
    lista.innerHTML = "";

    const soloPromos = cats.filter(c => c.tipo === "promocion");
    soloPromos.forEach(c => {
      const op = document.createElement("option");
      op.value = c.nombre;
      lista.appendChild(op);
    });
  } catch (e) {
    console.warn("No se pudieron cargar categorías de promos");
  }
}

// ========================
// CARGAR PROMOCIONES
// ========================
async function cargarPromos() {
  await cargarCategoriasPromo();

  const res = await fetch("/promos");
  const data = await res.json();

  const tbody = document.querySelector("#tablaPromos tbody");
  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.image ? `<img src="${p.image}" width="60" />` : ""}</td>
      <td>${p.title}</td>
      <td>${p.categoria || "-"}</td>
      <td>$${p.price ?? ""}</td>
      <td>
        <button onclick="editarPromo(${p.id})">Editar</button>
        <button class="eliminar" onclick="eliminarPromo(${p.id})">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ========================
// GUARDAR (CREAR / EDITAR) PROMO
// ========================
async function guardarPromo() {
  const id = document.getElementById("promo_id").value;
  const title = document.getElementById("promo_title").value.trim();
  const price = +document.getElementById("promo_price").value;
  const description = document.getElementById("promo_desc").value.trim();
  const categoria = document.getElementById("promo_categoria").value.trim();
  const imgFile = document.getElementById("promo_image").files[0];

  const msg = document.getElementById("msgPromo");
  msg.textContent = "";
  msg.className = "mensaje";

  if (!title || !price) {
    msg.textContent = "Título y precio son obligatorios";
    msg.classList.add("error");
    return;
  }

  let imageUrl = null;

  // Subir imagen si se cargó una nueva
  if (imgFile) {
    const fd = new FormData();
    fd.append("file", imgFile);

    const r = await fetch("/upload", {
      method: "POST",
      body: fd
    });
    const d = await r.json();

    if (!r.ok || !d.url) {
      msg.textContent = "Error subiendo imagen";
      msg.classList.add("error");
      return;
    }

    imageUrl = d.url;
  }

  const body = {
    title,
    description,
    price,
    categoria,
  };

  if (imageUrl) body.image = imageUrl;

  let res;
  // Crear
  if (!id) {
    res = await fetch("/promos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
  }
  // Editar
  else {
    res = await fetch(`/promos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    msg.textContent = "Error guardando promoción";
    msg.classList.add("error");
    return;
  }

  msg.textContent = "Promoción guardada correctamente";
  msg.classList.add("ok");

  setTimeout(() => {
    closePromoModal();
    cargarPromos();
  }, 700);
}

// ========================
// EDITAR PROMO
// ========================
async function editarPromo(id) {
  const res = await fetch(`/promos/${id}`);
  const p = await res.json();

  openPromoModal();
  document.getElementById("promoModalTitulo").textContent = "Editar Promoción";

  document.getElementById("promo_id").value = p.id;
  document.getElementById("promo_title").value = p.title;
  document.getElementById("promo_price").value = p.price ?? "";
  document.getElementById("promo_price_usd").value =
    p.price ? (p.price / dolarPromo).toFixed(2) + " USD" : "";
  document.getElementById("promo_desc").value = p.description || "";
  document.getElementById("promo_categoria").value = p.categoria || "";
  document.getElementById("promo_image").value = "";
}

// ========================
// ELIMINAR PROMO
// ========================
async function eliminarPromo(id) {
  if (!confirm("¿Eliminar esta promoción?")) return;

  await fetch(`/promos/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  cargarPromos();
}

