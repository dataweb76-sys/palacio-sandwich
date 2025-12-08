const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./palacio.db", (err) => {
  if (err) return console.error("Error abriendo la BD:", err);
  console.log("Reseteando usuario admin...");
});

db.serialize(() => {

  db.run("DELETE FROM admin WHERE user='admin'", function (err) {
    if (err) {
      console.error("Error al borrar usuario:", err);
      return;
    }

    console.log("Usuario admin eliminado (si existía).");

    db.run(
      "INSERT INTO admin (user, pass, role) VALUES (?, ?, ?)",
      ["admin", "admin123", "superadmin"],
      function (err2) {
        if (err2) {
          console.error("Error al crear admin:", err2);
          return;
        }

        console.log("Usuario admin creado exitosamente:");
        console.log("Usuario: admin");
        console.log("Contraseña: admin123");

        console.log("LISTO ✔");

        // CIERRE SEGURO SOLO DESPUÉS DE TERMINAR TODO
        db.close();
      }
    );
  });
});
