// C:\El palacio del sándwich\server\utils\log.js
const db = require("../database");

/**
 * Registra una acción de un usuario en la tabla logs
 * @param {Object} userObj  Objeto con { id, user, role }
 * @param {string} action   Código corto, ej: "LOGIN", "PRODUCT_CREATE"
 * @param {string} detalle  Texto libre con info extra
 */
function logAction(userObj, action, detalle) {
  if (!userObj) return;

  const user_id = userObj.id || null;
  const username = userObj.user || userObj.username || null;
  const ts = new Date().toISOString();

  db.run(
    "INSERT INTO logs (user_id, username, action, detalle, timestamp) VALUES (?, ?, ?, ?, ?)",
    [user_id, username, action, detalle || "", ts],
    (err) => {
      if (err) {
        console.error("Error guardando log:", err);
      }
    }
  );
}

module.exports = logAction;
