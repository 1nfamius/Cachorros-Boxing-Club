// noticias.js
// Lee los archivos Markdown generados por Pages CMS
// y los pinta en la página de noticias.

let todasLasNoticias = [];
let filtroActivo = "todos";

// Lista de noticias disponibles
// Pages CMS guarda cada noticia como un .md en /content/noticias/
// Este archivo se actualiza automáticamente con cada nueva noticia
const NOTICIAS_INDEX = "/content/noticias/index.json";

/* =====================
   INICIALIZACIÓN
   ===================== */

async function init() {
  await cargarNoticias();
  initFiltros();
}

/* =====================
   CARGA DE NOTICIAS
   ===================== */

async function cargarNoticias() {
  try {
    const res = await fetch(NOTICIAS_INDEX);
    if (!res.ok) throw new Error("No se encontró el índice");
    const archivos = await res.json();

    const promesas = archivos.map(archivo => cargarNoticia(archivo));
    todasLasNoticias = (await Promise.all(promesas)).filter(n => n !== null);

    // Ordena por fecha, más reciente primero
    todasLasNoticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    renderNoticias(todasLasNoticias);
  } catch (err) {
    document.getElementById("noticias-grid").innerHTML =
      '<p class="sin-noticias">No hay noticias disponibles aún</p>';
  }
}

async function cargarNoticia(archivo) {
  const res = await fetch(`/content/noticias/${archivo}`);
  const texto = await res.text();
  return parsearMarkdown(texto, archivo);
}

// Parsea el frontmatter YAML + contenido markdown
function parsearMarkdown(texto, archivo) {
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const contenido = match[2].trim();

  const noticia = { archivo, contenido };

  // Extrae los campos del frontmatter
  frontmatter.split("\n").forEach(linea => {
    const [clave, ...valor] = linea.split(": ");
    if (clave && valor.length) {
      noticia[clave.trim()] = valor.join(": ").trim().replace(/^"(.*)"$/, "$1");
    }
  });

  return noticia;
}

/* =====================
   RENDER NOTICIAS
   ===================== */

function renderNoticias(noticias) {
  const grid = document.getElementById("noticias-grid");

  const filtradas = filtroActivo === "todos"
    ? noticias.filter(n => n !== null)
    : noticias.filter(n => n !== null && n.tipo === filtroActivo);

  if (filtradas.length === 0) {
    grid.innerHTML = '<p class="sin-noticias">No hay entradas en esta categoría</p>';
    return;
  }

  grid.innerHTML = filtradas.map((n, i) => `
    <div class="noticia-card" onclick="openNoticia(${i})">
      ${n.imagen
        ? `<img class="noticia-img" src="${n.imagen}" alt="${n.titulo}" onerror="this.style.display='none'">`
        : `<div class="noticia-img-placeholder"><span>CBC</span></div>`
      }
      <div class="noticia-body">
        <div class="noticia-meta">
          <span class="noticia-tipo ${n.tipo || ''}">${labelTipo(n.tipo)}</span>
          <span class="noticia-fecha">${formatearFecha(n.fecha)}</span>
        </div>
        <h3 class="noticia-titulo">${n.titulo || 'Sin título'}</h3>
        ${n.resumen ? `<p class="noticia-resumen">${n.resumen}</p>` : ''}
      </div>
    </div>
  `).join("");

  // Guarda las noticias filtradas para el modal
  window._noticiasFiltradas = filtradas;
}

/* =====================
   MODAL
   ===================== */

function openNoticia(i) {
  const n = window._noticiasFiltradas[i];
  if (!n) return;

  const contenido = document.getElementById("noticia-modal-content");

  contenido.innerHTML = `
    ${n.imagen
      ? `<img class="noticia-modal-img" src="${n.imagen}" alt="${n.titulo}">`
      : ''
    }
    <div class="noticia-modal-meta">
      <span class="noticia-tipo ${n.tipo || ''}">${labelTipo(n.tipo)}</span>
      <span class="noticia-fecha">${formatearFecha(n.fecha)}</span>
    </div>
    <h2 class="noticia-modal-titulo">${n.titulo}</h2>
    <div class="noticia-modal-texto">${marked.parse(n.contenido || '')}</div>
  `;

  document.getElementById("noticia-overlay").classList.add("open");
  document.getElementById("noticia-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeNoticia() {
  document.getElementById("noticia-overlay").classList.remove("open");
  document.getElementById("noticia-modal").classList.remove("open");
  document.body.style.overflow = "";
}

/* =====================
   FILTROS
   ===================== */

function initFiltros() {
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filtroActivo = btn.dataset.filtro;
      renderNoticias(todasLasNoticias);
    });
  });
}

/* =====================
   HELPERS
   ===================== */

function formatearFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function labelTipo(tipo) {
  const labels = {
    noticia: "Noticia",
    evento: "Evento",
    resultado: "Resultado",
    comunicado: "Comunicado"
  };
  return labels[tipo] || tipo || "Noticia";
}

// Arranca
document.addEventListener("DOMContentLoaded", init);