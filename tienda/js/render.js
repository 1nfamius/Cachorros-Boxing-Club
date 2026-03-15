// render.js
// Pinta los productos, el carrito y gestiona el modal de cada producto.

// Variable que guarda el producto abierto en el modal
let modalProduct = null;
let selectedColor = null;
let selectedTalla = null;

// Mapa de colores para los puntos visuales
const colorMap = {
  negro: "#111111",
  rojo: "#D85A30",
  azul: "#2563EB",
  blanco: "#FFFFFF",
  gris: "#888888",
  transparente: "#e0e0e0"
};

/* =====================
   RENDER PRODUCTOS
   ===================== */

function renderProducts() {
  const container = document.getElementById("products");

  container.innerHTML = products.map(p => `
    <div class="product-card" onclick="openModal(${p.id})">

      ${p.imagenes.length > 0
        ? `<img class="product-img" src="${p.imagenes[0]}" alt="${p.nombre}" onerror="this.style.display='none'">`
        : `<div class="product-img-placeholder">📦</div>`
      }

      <div class="product-info">
        <p class="product-name">${p.nombre}</p>
        <p class="product-price">${p.precio.toFixed(2)} €</p>

        <!-- Puntos de colores disponibles -->
        <div class="product-colores">
          ${p.colores.map(c => `
            <div class="color-dot" style="background: ${colorMap[c] || '#ccc'}; ${c === 'blanco' ? 'border: 1px solid #ccc;' : ''}"></div>
          `).join("")}
        </div>

        <button class="add-btn">Ver producto</button>
      </div>
    </div>
  `).join("");
}

/* =====================
   MODAL DE PRODUCTO
   ===================== */

function openModal(id) {
  modalProduct = products.find(p => p.id === id);
  selectedColor = null;
  selectedTalla = null;

  document.getElementById("modal-name").textContent = modalProduct.nombre;
  document.getElementById("modal-desc").textContent = modalProduct.descripcion;
  document.getElementById("modal-price").textContent = modalProduct.precio.toFixed(2) + " €";
  document.getElementById("modal-error").textContent = "";

  // Imágenes
  document.getElementById("modal-imgs").innerHTML = modalProduct.imagenes.map(img => `
    <img src="${img}" alt="${modalProduct.nombre}" onerror="this.style.display='none'">
  `).join("");

  // Selector de colores
  const colorSelector = document.getElementById("color-selector");
  const colorOptions = document.getElementById("color-options");

  if (modalProduct.colores.length > 0) {
    colorSelector.style.display = "flex";
    colorOptions.innerHTML = modalProduct.colores.map(c => `
      <button
        class="color-btn"
        style="background: ${colorMap[c] || '#ccc'}; ${c === 'blanco' ? 'border: 2px solid #ccc;' : ''}"
        title="${c}"
        onclick="selectColor('${c}', this)"
      ></button>
    `).join("");
  } else {
    colorSelector.style.display = "none";
  }

  // Selector de tallas
  const tallaSelector = document.getElementById("talla-selector");
  const tallaOptions = document.getElementById("talla-options");

  if (modalProduct.tallas.length > 0) {
    tallaSelector.style.display = "flex";
    tallaOptions.innerHTML = modalProduct.tallas.map(t => `
      <button class="option-btn" onclick="selectTalla('${t}', this)">${t}</button>
    `).join("");
  } else {
    tallaSelector.style.display = "none";
    selectedTalla = "unica"; // Sin talla, se marca como única
  }

  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("modal").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
  modalProduct = null;
}

function selectColor(color, btn) {
  selectedColor = color;
  document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
}

function selectTalla(talla, btn) {
  selectedTalla = talla;
  document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
}

// Valida que se haya elegido color y talla antes de añadir al carrito
function addFromModal() {
  const error = document.getElementById("modal-error");

  if (modalProduct.colores.length > 0 && !selectedColor) {
    error.textContent = "Elige un color antes de continuar.";
    return;
  }

  if (modalProduct.tallas.length > 0 && !selectedTalla) {
    error.textContent = "Elige una talla antes de continuar.";
    return;
  }

  addToCart(modalProduct, selectedTalla, selectedColor);
  closeModal();
  toggleCart();
}

/* =====================
   RENDER CARRITO
   ===================== */

function renderCart() {
  const container = document.getElementById("cart-items");

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">El carrito está vacío</p>';
    return;
  }

  container.innerHTML = cart.map(i => `
    <div class="cart-item">
      <img class="cart-item-img" src="${i.imagen}" alt="${i.nombre}" onerror="this.style.background='#f0f0f0'">
      <div class="cart-item-info">
        <p class="cart-item-name">${i.nombre}</p>
        <p class="cart-item-variant">${i.talla !== "unica" ? i.talla + " · " : ""}${i.color || ""}</p>
        <p class="cart-item-price">${i.precio.toFixed(2)} €</p>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="removeFromCart('${i.key}')">−</button>
          <span class="qty-num">${i.qty}</span>
          <button class="qty-btn" onclick="addToCart({id:${i.id}, nombre:'${i.nombre}', precio:${i.precio}, imagenes:['${i.imagen}']}, '${i.talla}', '${i.color}')">+</button>
        </div>
      </div>
    </div>
  `).join("");
}