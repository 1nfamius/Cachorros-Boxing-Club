// render.js
// Pinta los productos con filtros, orden, destacados,
// paginación de 15 en 15 y colores bicolor.

let modalProduct = null;
let selectedColor = null;
let selectedTalla = null;
let categoriaActiva = "todos";
let ordenActivo = "destacado";
let productosMostrados = 15;
let productosFiltradosActuales = [];

const PRODUCTOS_POR_PAGINA = 15;

/* =====================
   INICIALIZACIÓN
   ===================== */

function initControles() {
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      categoriaActiva = btn.dataset.cat;
      productosMostrados = PRODUCTOS_POR_PAGINA; // reset al cambiar filtro
      renderProducts();
    });
  });

  document.getElementById("orden-select").addEventListener("change", e => {
    ordenActivo = e.target.value;
    productosMostrados = PRODUCTOS_POR_PAGINA; // reset al cambiar orden
    renderProducts();
  });
}

/* =====================
   HELPERS
   ===================== */

function getImagenesDefault(producto) {
  if (producto.colores && producto.colores.length > 0) {
    return producto.colores[0].imagenes || [];
  }
  return producto.imagenes || [];
}

// Genera el CSS del punto de color, soporta hex string o array de dos colores
function getColorStyle(hex, nombre) {
  const borde = nombre === "blanco" ? "border: 1px solid rgba(255,255,255,0.3);" : "";
  if (Array.isArray(hex)) {
    return `background: linear-gradient(135deg, ${hex[0]} 50%, ${hex[1]} 50%); ${borde}`;
  }
  return `background: ${hex}; ${borde}`;
}

/* =====================
   RENDER PRODUCTOS
   ===================== */

function renderProducts() {
  let filtrados = categoriaActiva === "todos"
    ? [...products]
    : products.filter(p => p.categoria === categoriaActiva);

  filtrados = ordenar(filtrados);
  productosFiltradosActuales = filtrados;

  // Destacados
  const destacadosWrap = document.getElementById("destacados-wrap");
  const destacados = products.filter(p => p.destacado);

  if (categoriaActiva === "todos" && ordenActivo === "destacado" && destacados.length > 0) {
    destacadosWrap.style.display = "block";
    renderGrid("products-destacados", destacados, false);
  } else {
    destacadosWrap.style.display = "none";
  }

  // Grid principal con paginación
  const visibles = filtrados.slice(0, productosMostrados);
  renderGrid("products", visibles, false);

  // Botón ver más
  renderVerMas(filtrados.length);
}

function renderGrid(containerId, lista, append) {
  const container = document.getElementById(containerId);

  if (lista.length === 0) {
    container.innerHTML = '<p class="sin-productos">No hay productos en esta categoría</p>';
    return;
  }

  const html = lista.map(p => {
    const imgs = getImagenesDefault(p);
    const imgPrincipal = imgs[0] || "";

    return `
      <div class="product-card${p.destacado ? ' product-destacado' : ''}" onclick="openModal(${p.id})">
        ${p.destacado ? '<span class="badge-destacado">Destacado</span>' : ''}
        ${imgPrincipal
          ? `<img class="product-img" src="${imgPrincipal}" alt="${p.nombre}" onerror="this.style.display='none'">`
          : `<div class="product-img-placeholder">📦</div>`
        }
        <div class="product-info">
          <p class="product-name">${p.nombre}</p>
          <p class="product-price">${p.precio.toFixed(2)} €</p>
          <div class="product-colores">
            ${(p.colores || []).map(c => `
              <div class="color-dot" style="${getColorStyle(c.hex, c.nombre)}"></div>
            `).join("")}
          </div>
          <button class="add-btn">Ver producto</button>
        </div>
      </div>
    `;
  }).join("");

  if (append) {
    container.insertAdjacentHTML("beforeend", html);
  } else {
    container.innerHTML = html;
  }
}

function renderVerMas(total) {
  // Elimina botón anterior si existe
  const anterior = document.getElementById("ver-mas-btn");
  if (anterior) anterior.remove();

  if (productosMostrados >= total) return;

  const quedan = total - productosMostrados;
  const btn = document.createElement("div");
  btn.id = "ver-mas-btn";
  btn.className = "ver-mas-wrap";
  btn.innerHTML = `
    <button class="ver-mas-btn" onclick="cargarMas()">
      Ver más productos
      <span class="ver-mas-count">${quedan} restantes</span>
    </button>
  `;

  document.getElementById("products").after(btn);
}

function cargarMas() {
  productosMostrados += PRODUCTOS_POR_PAGINA;
  const visibles = productosFiltradosActuales.slice(0, productosMostrados);

  // Renderiza solo los nuevos productos añadiéndolos al grid
  const nuevos = productosFiltradosActuales.slice(
    productosMostrados - PRODUCTOS_POR_PAGINA,
    productosMostrados
  );
  renderGrid("products", productosFiltradosActuales.slice(0, productosMostrados), false);
  renderVerMas(productosFiltradosActuales.length);
}

/* =====================
   ORDENAR
   ===================== */

function ordenar(lista) {
  switch (ordenActivo) {
    case "precio-asc":
      return [...lista].sort((a, b) => a.precio - b.precio);
    case "precio-desc":
      return [...lista].sort((a, b) => b.precio - a.precio);
    case "nombre":
      return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
    case "destacado":
    default:
      return [...lista].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
  }
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

  renderModalImagenes(getImagenesDefault(modalProduct));

  // Selector de colores
  const colorSelector = document.getElementById("color-selector");
  const colorOptions = document.getElementById("color-options");

  if (modalProduct.colores && modalProduct.colores.length > 0) {
    colorSelector.style.display = "flex";
    colorOptions.innerHTML = modalProduct.colores.map(c => `
      <button
        class="color-btn"
        style="${getColorStyle(c.hex, c.nombre)}"
        title="${c.nombre}"
        onclick="selectColor('${c.nombre}', this)"
      ></button>
    `).join("");
  } else {
    colorSelector.style.display = "none";
  }

  // Selector de tallas
  const tallaSelector = document.getElementById("talla-selector");
  const tallaOptions = document.getElementById("talla-options");

  if (modalProduct.tallas && modalProduct.tallas.length > 0) {
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

function renderModalImagenes(imagenes) {
  document.getElementById("modal-imgs").innerHTML = imagenes.map(img => `
    <img src="${img}" alt="${modalProduct ? modalProduct.nombre : ''}"
      onclick="openLightbox('${img}')"
      onerror="this.style.display='none'">
  `).join("");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
  modalProduct = null;
}

function selectColor(nombreColor, btn) {
  selectedColor = nombreColor;
  document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  if (modalProduct && modalProduct.colores) {
    const colorData = modalProduct.colores.find(c => c.nombre === nombreColor);
    if (colorData && colorData.imagenes && colorData.imagenes.length > 0) {
      renderModalImagenes(colorData.imagenes);
    }
  }
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

/* =====================
   ARRANQUE
   ===================== */

document.addEventListener("DOMContentLoaded", initControles);