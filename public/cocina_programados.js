// ==========================================
// PANEL DE PEDIDOS PROGRAMADOS – COCINA
// ==========================================

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

let programados = [];
let intervalCountdown;

// =============================
// CARGAR PEDIDOS PROGRAMADOS
// =============================
async function cargarProgramados() {
  try {
    const res = await fetch("/pedidos", {
      headers: { Authorization: "Bearer " + token }
    });

    const all = await res.json();

    programados = all
      .filter(p => p.hora_entrega && p.hora_entrega.trim() !== "")
      .filter(p => p.estado !== "entregado")
      .sort((a, b) => a.hora_entrega.localeCompare(b.hora_entrega));

    renderProgramados();
    actualizarCountdown();

  } catch (e) {
    console.error("Error cargando programados:", e);
  }
}

// =============================
// MOSTRAR EN GRID
// =============================
function renderProgramados() {
  const grid = document.getElementById("programadosGrid");
  const vacio = document.getElementById("vacio");

  grid.innerHTML = "";

  if (!programados.length) {
    vacio.style.display = "block";
    return;
  }

  vacio.style.display = "none";

  programados.forEach((p, index) => {
    const div = document.createElement("div");
    div.className = "p-card";

    let itemsHtml = "";
    try {
      JSON.parse(p.items_json || "[]").forEach(it => {
        itemsHtml += `${it.cantidad || 1} × ${it.nombre}<br>`;
      });
    } catch {}

    div.innerHTML = `
      <div class="p-header">
        <span>#${p.id} — ${p.nombre_cliente}</span>
        <span class="hora">${p.hora_entrega}</span>
      </div>

      <div style="font-size:13px; margin-bottom:6px;">
        ${itemsHtml}
      </div>

      <div class="countdown" id="cd-${index}">
        Calculando…
      </div>
    `;

    grid.appendChild(div);
  });
}

// =============================
// COUNTDOWN EN TIEMPO REAL
// =============================
function actualizarCountdown() {
  if (intervalCountdown) clearInterval(intervalCountdown);

  intervalCountdown = setInterval(() => {
    const ahora = new Date();

    programados.forEach((p, index) => {
      if (!p.hora_entrega) return;

      const cdEl = document.getElementById(`cd-${index}`);
      if (!cdEl) return;

      const [hh, mm] = p.hora_entrega.split(":").map(Number);

      const target = new Date();
      target.setHours(hh, mm, 0, 0);

      const diff = target - ahora;

      // Si ya pasó, remover automáticamente
      if (diff <= 0) {
        cdEl.innerHTML = `<span class="critico">❗ Hora alcanzada</span>`;
        return;
      }

      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);

      let clase = "ok";
      if (min <= 5) clase = "critico";
      else if (min <= 15) clase = "medio";

      cdEl.innerHTML = `<span class="${clase}">⏱ ${min}m ${sec}s</span>`;
    });

  }, 1000);
}

// =============================
// INICIO
// =============================
window.addEventListener("DOMContentLoaded", () => {
  cargarProgramados();
  setInterval(cargarProgramados, 20000); // refresco cada 20s
});
