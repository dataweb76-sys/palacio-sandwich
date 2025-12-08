// ============================
// VALIDAR LOGIN + ROL SUPERADMIN
// ============================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

let usuarioLogueado = null;

// verificamos rol
async function validarSuperadmin() {
  const payload = JSON.parse(atob(token.split(".")[1]));

  usuarioLogueado = payload;

  if (!payload.role || payload.role !== "superadmin") {
    alert("Solo el SUPERADMIN puede acceder aquí.");
    window.location.href = "admin.html";
    return;
  }
}

validarSuperadmin();

// ============================
// BOTONES SUPERIORES
// ============================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

function goBack() {
  window.location.href = "admin.html";
}

// ============================
// CARGAR LISTA DE ADMINISTRADORES
// ============================
async function cargarAdmins() {
  const res = await fetch("/admins", {
    headers: { Authorization: "Bearer " + token },
  });

  if (res.status !== 200) {
    alert("Error cargando administradores");
    return;
  }

  const lista = await res.json();
  renderAdmins(lista);
}

function renderAdmins(lista) {
  const tbody = document.querySelector("#tablaAdmins tbody");
  tbody.innerHTML = "";

  lista.forEach((adm) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${adm.id}</td>
      <td>${adm.user}</td>
      <td>${adm.role}</td>
      <td>
        ${
          adm.role === "superadmin"
            ? `<span style="color:#555">SUPERADMIN</span>`
            : `<button class="eliminar" onclick="eliminarAdmin(${adm.id})">Eliminar</button>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ============================
// CREAR ADMIN
// ============================
document
  .getElementById("form-admin")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = document.getElementById("admin_user").value.trim();
    const pass = document.getElementById("admin_pass").value.trim();
    const role = document.getElementById("admin_role").value;

    const msg = document.getElementById("admin-msg");
    msg.textContent = "";
    msg.className = "mensaje";

    if (!user || !pass) {
      msg.textContent = "Faltan datos";
      msg.classList.add("error");
      return;
    }

    const res = await fetch("/admins", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user, pass, role }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      msg.textContent = data.error || "Error creando admin";
      msg.classList.add("error");
      return;
    }

    msg.textContent = "Admin creado correctamente";
    msg.classList.add("ok");

    document.getElementById("form-admin").reset();

    cargarAdmins();
  });

// ============================
// ELIMINAR ADMIN
// ============================
async function eliminarAdmin(id) {
  if (!confirm("¿Eliminar este administrador?")) return;

  const res = await fetch("/admins/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    alert(data.error || "Error eliminando");
    return;
  }

  cargarAdmins();
}

window.eliminarAdmin = eliminarAdmin;

// ============================
// INICIO
// ============================
window.addEventListener("DOMContentLoaded", () => {
  cargarAdmins();
});
