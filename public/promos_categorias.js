const token = localStorage.getItem("token");
if (!token) location.href = "login.html";

function goBack() { location.href = "dashboard.html"; }
function logout() { localStorage.removeItem("token"); location.href = "login.html"; }

// Cargar categorías
async function cargarTabla() {
  const r = await fetch("/categories_promos", {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await r.json();

  const tbody = document.querySelector("#tabla tbody");
  tbody.innerHTML = "";

  data.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.description || ""}</td>
      <td>
        <button onclick="editar(${c.id})">Editar</button>
        <button class="eliminar" onclick="eliminarCat(${c.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("form-catpromo")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("cat_id").value;
    const name = document.getElementById("cat_name").value;
    const description = document.getElementById("cat_desc").value;
    const msg = document.getElementById("msg");

    const body = { name, description };

    let r;
    if (!id) {
      r = await fetch("/categories_promos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body)
      });
    } else {
      r = await fetch(`/categories_promos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body)
      });
    }

    if (!r.ok) {
      msg.textContent = "Error guardando categoría";
      msg.className = "mensaje error";
      return;
    }

    msg.textContent = "Guardado correctamente";
    msg.className = "mensaje ok";

    resetForm();
    cargarTabla();
  });

async function editar(id) {
  const r = await fetch("/categories_promos/" + id, {
    headers: { Authorization: "Bearer " + token }
  });
  const c = await r.json();

  document.getElementById("cat_id").value = c.id;
  document.getElementById("cat_name").value = c.name;
  document.getElementById("cat_desc").value = c.description;
}

async function eliminarCat(id) {
  if (!confirm("¿Eliminar esta categoría?")) return;

  await fetch("/categories_promos/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  cargarTabla();
}

function resetForm() {
  document.getElementById("form-catpromo").reset();
  document.getElementById("cat_id").value = "";
}

document.addEventListener("DOMContentLoaded", cargarTabla);
