// C:\El palacio del sándwich\server\public\reservas_calendario.js

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

let reservas = [];
let añoActual = new Date().getFullYear();
let mesActual = new Date().getMonth(); // 0-11

const NOMBRES_MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

window.addEventListener("DOMContentLoaded", cargarReservas);

// =============================
// CARGAR RESERVAS
// =============================
async function cargarReservas() {
  try {
    const res = await fetch("/reservas", {
      headers: { Authorization: "Bearer " + token }
    });

    reservas = await res.json();
    dibujarCalendario();
  } catch (e) {
    console.error("Error cargando reservas:", e);
  }
}

// =============================
// CAMBIO DE MES
// =============================
function cambiarMes(delta) {
  mesActual += delta;

  if (mesActual < 0) {
    mesActual = 11;
    añoActual--;
  }
  if (mesActual > 11) {
    mesActual = 0;
    añoActual++;
  }

  dibujarCalendario();
}

// =============================
// DIBUJAR CALENDARIO COMPLETO
// =============================
function dibujarCalendario() {
  const cont = document.getElementById("calendario");
  cont.innerHTML = "";

  const titulo = document.getElementById("tituloMes");
  titulo.innerText = `${NOMBRES_MESES[mesActual]} ${añoActual}`;

  const primerDia = new Date(añoActual, mesActual, 1).getDay();
  const diasMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const offset = (primerDia === 0 ? 6 : primerDia - 1);

  const filtro = document.getElementById("filtroEstado").value;

  let cPend = 0, cPres = 0, cConf = 0;

  // Días vacíos antes del 1
  for (let i = 0; i < offset; i++) {
    const celda = document.createElement("div");
    celda.className = "calendar-day";
    cont.appendChild(celda);
  }

  // Días del mes
  for (let dia = 1; dia <= diasMes; dia++) {
    const celda = document.createElement("div");
    celda.className = "calendar-day";

    const fechaTexto = `${añoActual}-${String(mesActual + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    celda.innerHTML = `<div class="day-number">${dia}</div>`;

    // Reservas del día
    let delDia = reservas.filter(r => r.fecha_reserva === fechaTexto);

    // Filtro por estado
    if (filtro !== "todos") {
      delDia = delDia.filter(r => r.estado === filtro);
    }

    delDia.forEach(r => {
      if (r.estado === "pendiente") cPend++;
      if (r.estado === "presupuestado") cPres++;
      if (r.estado === "confirmado") cConf++;

      const estadoClase =
        r.estado === "confirmado"   ? "confirmado" :
        r.estado === "presupuestado"? "presupuestado" :
        "pendiente";

      const badge = document.createElement("div");
      const nombre = `${r.nombre || ""} ${r.apellido || ""}`.trim();
      const hora = r.hora ? r.hora.toString().slice(0,5) : "";
      const texto = hora ? `${nombre} - ${hora}` : nombre || "(Sin nombre)";

      badge.className = `badge ${estadoClase}`;
      badge.innerText = texto;

      badge.onclick = () => {
        window.location.href = `admin/reserva_detalle.html?id=${r.id}`;
      };

      celda.appendChild(badge);
    });

    cont.appendChild(celda);
  }

  const totalMes = cPend + cPres + cConf;

  document.getElementById("contadores").innerHTML = `
    <span class="c-pendiente">Pendientes: ${cPend}</span>
    <span class="c-presupuestado">Presupuestados: ${cPres}</span>
    <span class="c-confirmado">Confirmados: ${cConf}</span>
    <span class="c-total">Total: ${totalMes}</span>
  `;
}

// =============================
// EXPORTAR A EXCEL (MES ACTUAL)
// =============================
async function exportarExcel() {
  const anio = añoActual;
  const mes = mesActual + 1; // 1-12

  try {
    const res = await fetch(`/reservas/exportar/${anio}/${mes}`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      alert("Error al exportar las reservas.");
      return;
    }

    const blob = await res.blob();

    const nombreMes = NOMBRES_MESES[mesActual];
    const fileName = `El Palacio del Sándwich ${nombreMes} ${anio}.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (e) {
    console.error("Error exportando Excel:", e);
    alert("Ocurrió un error al generar el archivo Excel.");
  }
}
