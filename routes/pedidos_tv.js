async function cargarTV() {
  const res = await fetch("/pedidos_estado/listo");
  const lista = await res.json();

  const div = document.getElementById("lista");
  div.innerHTML = "";

  lista.forEach(p => {
    div.innerHTML += `
      <div class="item">#${p.id} — ${p.nombre_cliente}</div>
    `;
  });
}

setInterval(cargarTV, 3000);
cargarTV();
