(function() {

const GITHUB_USER = "1nfamius";
const GITHUB_REPO = "Cachorros-Boxing-Club";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "content/noticias";

const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
const RAW_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${CONTENT_PATH}`;

let todasLasNoticias = [];
let filtroActivo = "todos";

async function init() {
  await cargarNoticias();
  initFiltros();
}

async function cargarNoticias() {
  try {
    const res = await fetch(API_URL + `?_=${Date.now()}`);
    if (!res.ok) throw new Error("Error listando noticias");
    const archivos = await res.json();

    const mds = archivos
      .filter(f => f.name.endsWith(".md"))
      .map(f => f.name.replace(/^\[|\]$/g, ""));

    const promesas = mds.map(nombre => cargarNoticia(nombre));
    todasLasNoticias = (await Promise.all(promesas)).filter(n => n !== null);

    todasLasNoticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    renderNoticias(todasLasNoticias);
  } catch (err) {
    console.error(err);
    document.getElementById("noticias-grid").innerHTML =
      '<p class="sin-noticias">No hay noticias disponibles aún</p>';
  }
}

async function cargarNoticia(nombre) {
  try {
    const res = await fetch(`${RAW_BASE}/${nombre}?_=${Date.now()}`);
    if (!res.ok) return null;
    const texto = await res.text();
    return parsearMarkdown(texto, nombre);
  } catch {
    return null;
  }
}

function parsearMarkdown(texto, archivo) {
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const contenido = match[2].trim();
  const noticia = { archivo, contenido };

  frontmatter.split("\n").forEach(linea => {
    const separador = linea.indexOf(": ");
    if (separador === -1) return;
    const clave = linea.slice(0, separador).trim();
    const valor = linea.slice(separador + 2).trim().replace(/^"(.*)"$/, "$1");
    if (clave) noticia[clave] = valor;
  });

  return noticia;
}

function renderNoticias(noticias) {
  const grid = document.getElementById("noticias-grid");

  const filtradas = filtroActivo === "todos"
    ? noticias
    : noticias.filter(n => n.tipo === filtroActivo);

  window._noticiasFiltradas = filtradas;

  if (filtradas.length === 0) {
    grid.innerHTML = '<p class="sin-noticias">No hay entradas en esta categoría</p>';
    return;
  }

  grid.innerHTML = filtradas.map((n, i) => `
    <div class="noticia-card" onclick="window._openNoticia(${i})">
      ${n.imagen
        ? `<img class="noticia-img" src="${resolverImagen(n.imagen)}" alt="${n.titulo || ''}" loading="lazy" onerror="this.style.display='none'">`
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
}

function resolverImagen(ruta) {
  if (!ruta) return "";
  if (ruta.startsWith("http")) return ruta;
  const limpia = ruta.replace(/^\//, "");
  return `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${limpia}`;
}

function openNoticia(i) {
  const n = window._noticiasFiltradas[i];
  if (!n) return;

  const contenido = document.getElementById("noticia-modal-content");

  const infoCombate = n.tipo === "combate" && (n.peleador || n.rival) ? `
    <div class="combate-info-modal">
      <span class="combate-vs">${n.peleador || '?'} <em>vs</em> ${n.rival || '?'}</span>
      ${n.lugar ? `<span class="combate-detalle">📍 ${n.lugar}</span>` : ''}
      ${n.fecha_combate ? `<span class="combate-detalle">🗓️ ${formatearFecha(n.fecha_combate)}</span>` : ''}
      ${n.hora_combate ? `<span class="combate-detalle">🕘 ${n.hora_combate}</span>` : ''}
    </div>
  ` : '';

  const imgSrc = resolverImagen(n.cartelera || n.imagen);

  contenido.innerHTML = `
    ${imgSrc ? `<img class="noticia-modal-img" src="${imgSrc}" alt="${n.titulo || ''}">` : ''}
    <div class="noticia-modal-meta">
      <span class="noticia-tipo ${n.tipo || ''}">${labelTipo(n.tipo)}</span>
      <span class="noticia-fecha">${formatearFecha(n.fecha)}</span>
    </div>
    <h2 class="noticia-modal-titulo">${n.titulo || ''}</h2>
    ${infoCombate}
    <div class="noticia-modal-texto">${marked.parse(n.contenido || '')}</div>
  `;

  document.getElementById("noticia-overlay").classList.add("open");
  document.getElementById("noticia-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

// Exponer al scope global para los onclick del HTML generado dinámicamente
window._openNoticia = openNoticia;

function closeNoticia() {
  document.getElementById("noticia-overlay").classList.remove("open");
  document.getElementById("noticia-modal").classList.remove("open");
  document.body.style.overflow = "";
}

window.closeNoticia = closeNoticia;

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
    comunicado: "Comunicado",
    combate: "Combate"
  };
  return labels[tipo] || tipo || "Noticia";
}

document.addEventListener("DOMContentLoaded", init);

})();