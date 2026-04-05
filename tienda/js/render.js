// render.js
// Pinta los productos y gestiona el modal. Sin carrito ni pagos.

let modalProduct = null;
let selectedColor = null;
let selectedTalla = null;

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
        <div class="product-colores">
          ${p.colores.map(c => `
            <div class="color-dot" style="background: ${colorMap[c] || '#ccc'}; ${c === 'blanco' ? 'border: 1px solid rgba(255,255,255,0.3);' : ''}"></div>
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

  // Imágenes con lightbox
  document.getElementById("modal-imgs").innerHTML = modalProduct.imagenes.map(img => `
    <img src="${img}" alt="${modalProduct.nombre}"
      onclick="openLightbox('${img}')"
      onerror="this.style.display='none'">
  `).join("");

  // Selector de colores
  const colorSelector = document.getElementById("color-selector");
  const colorOptions = document.getElementById("color-options");

  if (modalProduct.colores.length > 0) {
    colorSelector.style.display = "flex";
    colorOptions.innerHTML = modalProduct.colores.map(c => `
      <button
        class="color-btn"
        style="background: ${colorMap[c] || '#ccc'}; ${c === 'blanco' ? 'border: 2px solid rgba(255,255,255,0.3);' : ''}"
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

/* =====================
   LIGHTBOX
   ===================== */

function openLightbox(src) {
  const lb = document.createElement("div");
  lb.id = "lightbox";
  lb.style.cssText = `
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    cursor: zoom-out;
  `;

  const img = document.createElement("img");
  img.src = src;
  img.style.cssText = `
    max-width: 90vw; max-height: 90vh;
    object-fit: contain;
    border: 1px solid rgba(204,0,0,0.3);
  `;

  lb.appendChild(img);
  lb.addEventListener("click", () => lb.remove());
  document.body.appendChild(lb);
}