// ==============================
// VALIDAR LOGIN
// ==============================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// ==============================
// BOTONES HEADER
// ==============================
function goBack() {
  window.location.href = "admin.html";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ==============================
// MODAL
// ==============================
function openModal() {
  document.getElementById("modalTitulo").textContent = "Nueva Categoría";
  document.getElementById("cat_id").value = "";
  document.getElementById("cat_nombre").value = "";
  document.getElementById("cat_tipo").value = "producto";
  document.getElementById("cat_image").value = "";
  document.getElementById("msgCat").textContent = "";

  document.getElementById("bloqueImagen").style.display = "none";
  document.getElementById("previewWrap").style.display = "none";

  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// mostrar / ocultar bloque imagen según tipo
document.addEventListener("DOMContentLoaded", () => {
  const selTipo = document.getElementById("cat_tipo");
  if (!selTipo) return;

  selTipo.addEventListener("change", () => {
    const tipo = selTipo.value;

    // Imagen se usa para cliente y reserva
    document.getElementById("bloqueImagen").style.display =
      (tipo === "cliente" || tipo === "reserva") ? "block" : "none";
  });
});

// ==============================
// CARGAR CATEGORÍAS
// ==============================
async function cargarCategorias() {
  const tbody = document.querySelector("#tablaCategorias tbody");
  const msgTabla = document.getElementById("msgTabla");

  tbody.innerHTML = "";
  msgTabla.textContent = "";

  try {
    const res = await fetch("/categories", {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      msgTabla.textContent =
        (data && data.error) || "Error cargando categorías.";
      msgTabla.className = "mensaje error";
      return;
    }

    if (data.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "No hay categorías cargadas.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.forEach((cat) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${cat.id}</td>
        <td>${cat.nombre}</td>
        <td><span class="badge badge-${cat.tipo}">${cat.tipo}</span></td>
        <td>
          ${
            cat.image
              ? `<img src="${cat.image}" width="60" style="border-radius:8px;">`
              : "-"
          }
        </td>
        <td>
          <button class="btn-accion btn-edit" onclick="editarCategoria(${cat.id})">Editar</button>
          <button class="btn-accion btn-delete" onclick="eliminarCategoria(${cat.id})">Eliminar</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando categorías:", err);
    msgTabla.textContent = "Error de conexión al cargar categorías.";
    msgTabla.className = "mensaje error";
  }
}

// ==============================
// EDITAR
// ==============================
async function editarCategoria(id) {
  const msg = document.getElementById("msgCat");
  msg.textContent = "";

  try {
    const res = await fetch(`/categories/${id}`, {
      headers: { Authorization: "Bearer " + token },
    });
    const cat = await res.json();

    if (!res.ok) {
      msg.textContent = cat.error || "No se pudo cargar la categoría.";
      msg.className = "mensaje error";
      return;
    }

    document.getElementById("modalTitulo").textContent = "Editar Categoría";
    document.getElementById("cat_id").value = cat.id;
    document.getElementById("cat_nombre").value = cat.nombre;
    document.getElementById("cat_tipo").value = cat.tipo;

    // mostrar imagen si es cliente o reserva
    document.getElementById("bloqueImagen").style.display =
      (cat.tipo === "cliente" || cat.tipo === "reserva") ? "block" : "none";

    if (cat.image) {
      document.getElementById("previewImg").src = cat.image;
      document.getElementById("previewWrap").style.display = "block";
    } else {
      document.getElementById("previewWrap").style.display = "none";
    }

    document.getElementById("cat_image").value = "";
    document.getElementById("modal").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    msg.textContent = "Error de conexión.";
    msg.className = "mensaje error";
  }
}

// ==============================
// GUARDAR (CREAR / EDITAR)
// ==============================
async function guardarCategoria() {
  const id = document.getElementById("cat_id").value;
  const nombre = document.getElementById("cat_nombre").value.trim();
  const tipo = document.getElementById("cat_tipo").value;
  const file = document.getElementById("cat_image").files[0];

  const msg = document.getElementById("msgCat");
  msg.textContent = "";
  msg.className = "mensaje";

  if (!nombre) {
    msg.textContent = "El nombre es obligatorio.";
    msg.className = "mensaje error";
    return;
  }

  let imageUrl = null;

  try {
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok || !upData.url) {
        msg.textContent = "Error subiendo la imagen.";
        msg.className = "mensaje error";
        return;
      }
      imageUrl = upData.url;
    }

    const body = { nombre, tipo };
    if (imageUrl) body.image = imageUrl;

    let res;
    if (!id) {
      res = await fetch("/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch(`/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || "Error guardando categoría.";
      msg.className = "mensaje error";
      return;
    }

    closeModal();
    cargarCategorias();
  } catch (err) {
    console.error(err);
    msg.textContent = "Error de conexión.";
    msg.className = "mensaje error";
  }
}

// ==============================
// ELIMINAR
// ==============================
async function eliminarCategoria(id) {
  if (!confirm("¿Eliminar esta categoría?")) return;

  try {
    const res = await fetch(`/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se pudo eliminar la categoría.");
      return;
    }

    cargarCategorias();
  } catch (err) {
    console.error(err);
    alert("Error de conexión al eliminar.");
  }
}

// ==============================
// INICIO
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  cargarCategorias();
});

// Exponer globales
window.goBack = goBack;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.guardarCategoria = guardarCategoria;
window.editarCategoria = editarCategoria;
window.eliminarCategoria = eliminarCategoria;
