// products.js
// Carga los productos desde el JSON y arranca la página.
// Usamos fetch() para leer el archivo products.json.

let products = [];

// Carga el JSON y arranca el render
fetch("data/products.json")
  .then(res => res.json())
  .then(data => {
    products = data;
    renderProducts();
  })
  .catch(err => {
    console.error("Error cargando productos:", err);
  });