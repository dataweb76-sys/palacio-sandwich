const db = require("./database");

// SOLO normalizamos nombres, NO tocamos el tipo (producto/cliente)
const normalizar = {
  "Masa madres": "Masa Madre",
  "Masa Madre": "Masa Madre",

  "Pizzas clásicas grandes": "Pizzas",
  "Pizzas": "Pizzas",

  "Sándwich de miga especiales x 8 unidades": "Sándwich de Miga",
  "Sándwich de miga clásicos x 8 unidades": "Sándwich de Miga",
  "Sándwich de miga especiales premium x 8 triples": "Sándwich de Miga",
  "Sándwich de Miga": "Sándwich de Miga",

  "Arabitos/ bandejas x 6 unidades": "Arabitos",
  "Arabitos": "Arabitos",

  "Bebidas": "Bebidas"
};

console.log("🔧 Normalizando categorías y productos...\n");

// 1) Normalizar categorías
db.all("SELECT id, nombre FROM categories", (err, cats) => {
  if (err) return console.error(err);

  cats.forEach(cat => {
    const nuevo = normalizar[cat.nombre];
    if (nuevo && nuevo !== cat.nombre) {
      db.run("UPDATE categories SET nombre=? WHERE id=?", [nuevo, cat.id]);
      console.log(`✔ Categoria corregida: ${cat.nombre} → ${nuevo}`);
    }
  });

  // 2) Normalizar productos
  db.all("SELECT id, category FROM products", (err2, prods) => {
    if (err2) return console.error(err2);

    prods.forEach(p => {
      const nuevo = normalizar[p.category];
      if (nuevo && nuevo !== p.category) {
        db.run("UPDATE products SET category=? WHERE id=?", [nuevo, p.id]);
        console.log(`✔ Producto ${p.id}: ${p.category} → ${nuevo}`);
      }
    });

    console.log("\n🎉 COMPLETO: categorías y productos alineados\n");
  });
});
