document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();
  const errorBox = document.getElementById("login-error");

  errorBox.style.display = "none";

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass })
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || "Credenciales incorrectas";
      errorBox.style.display = "block";
      return;
    }

    // Guardar token
    localStorage.setItem("token", data.token);

    // REDIRECCIÓN CORRECTA
    window.location.href = "/admin.html";

  } catch (error) {
    errorBox.textContent = "Error de conexión con el servidor";
    errorBox.style.display = "block";
  }
});
