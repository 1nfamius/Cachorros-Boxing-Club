(function() {

const GITHUB_USER = "1nfamius";
const GITHUB_REPO = "Cachorros-Boxing-Club";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "content/noticias";

const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
const RAW_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${CONTENT_PATH}`;

function resolverImagen(ruta) {
  if (!ruta) return "";
  if (ruta.startsWith("http")) return ruta;
  const limpia = ruta.replace(/^\//, "");
  return `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${limpia}`;
}

function parsearFrontmatter(texto) {
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  match[1].split("\n").forEach(linea => {
    const sep = linea.indexOf(": ");
    if (sep === -1) return;
    const clave = linea.slice(0, sep).trim();
    const valor = linea.slice(sep + 2).trim().replace(/^"(.*)"$/, "$1");
    if (clave) data[clave] = valor;
  });
  return data;
}

async function cargarFightBar() {
  try {
    const res = await fetch(API_URL + `?_=${Date.now()}`);
    if (!res.ok) return;
    const archivos = await res.json();

    const mds = archivos
      .filter(f => f.name.endsWith(".md"))
      .map(f => f.name.replace(/^\[|\]$/g, ""));

    const todos = await Promise.all(mds.map(async nombre => {
      try {
        const r = await fetch(`${RAW_BASE}/${nombre}?_=${Date.now()}`);
        const texto = await r.text();
        return parsearFrontmatter(texto);
      } catch { return null; }
    }));

    const ahora = new Date();
    const combates = todos
      .filter(d => d && d.tipo === "combate" && d.fecha_combate)
      .map(d => ({
        ...d,
        fechaObj: new Date(d.fecha_combate + "T" + (d.hora_combate || "20:00"))
      }))
      .filter(c => c.fechaObj >= new Date(ahora - 86400000))
      .sort((a, b) => a.fechaObj - b.fechaObj);

    if (!combates.length) return;

    let index = 0;
    let intervalo = null;
    const container = document.getElementById("fight-bar-container");

    container.innerHTML = `
      <div class="fight-bar">
        <a id="fight-link" href="#" class="fight-link">
          <span id="fight-label" class="fight-label"></span>
          <span id="fight-main" class="fight-main"></span>
          <span id="fight-extra" class="fight-extra"></span>
          <span id="fight-countdown" class="fight-countdown" style="display:none"></span>
        </a>
        <div id="fight-dots" class="fight-dots"></div>
      </div>
    `;

    document.body.classList.add('has-fight-bar');

    // Ajusta offset dinámicamente según altura real de la fight bar
    function ajustarOffset() {
      const bar = document.querySelector('.fight-bar');
      if (!bar) return;
      document.documentElement.style.setProperty('--fight-bar-height', bar.offsetHeight + 'px');
    }
    ajustarOffset();
    window.addEventListener('resize', ajustarOffset);
    setTimeout(ajustarOffset, 300);

    function renderDots() {
      const dotsEl = document.getElementById("fight-dots");
      if (!dotsEl || combates.length <= 1) return;
      dotsEl.innerHTML = combates.map((_, i) =>
        `<span class="fight-dot ${i === index ? 'active' : ''}" data-i="${i}"></span>`
      ).join("");
      dotsEl.querySelectorAll(".fight-dot").forEach(dot => {
        dot.addEventListener("click", (e) => {
          e.preventDefault();
          const i = parseInt(dot.dataset.i);
          if (i === index) return;
          clearInterval(intervalo);
          index = i;
          renderCombate(combates[index]);
          iniciarRotacion();
        });
      });
    }

    function renderCombate(c) {
      const diff = c.fechaObj - new Date();
      const esHoy = diff > -86400000 && diff <= 0;
      const esFuturo = diff > 0;

      const label = esHoy ? "HOY HAY COMBATE"
        : esFuturo ? "PROXIMA PELEA" : "COMBATE";

      const fechaTexto = c.fechaObj.toLocaleDateString("es-ES", {
        day: "numeric", month: "long"
      });

      const titulo = c.peleador && c.rival
        ? `${c.peleador} <span class="fight-vs">VS</span> ${c.rival}`
        : c.titulo || "";

      const imgCartelera = resolverImagen(c.cartelera || c.imagen);

      document.getElementById("fight-label").textContent = label;
      document.getElementById("fight-main").innerHTML = titulo;
      document.getElementById("fight-extra").innerHTML =
        `${c.lugar || ''} · ${fechaTexto} · ${c.hora_combate || ''}`;

      const linkEl = document.getElementById("fight-link");
      linkEl.href = '#';
      if (imgCartelera) {
        linkEl.onclick = (e) => { e.preventDefault(); abrirCartelera(imgCartelera); };
      } else {
        linkEl.onclick = null;
      }

      const countdownEl = document.getElementById("fight-countdown");
      countdownEl.style.display = esFuturo ? 'inline-flex' : 'none';

      if (esFuturo) iniciarCountdown(c.fechaObj);
      else if (countdownEl._timer) clearInterval(countdownEl._timer);

      renderDots();
      setTimeout(() => {
        const bar = document.querySelector('.fight-bar');
        if (bar) document.documentElement.style.setProperty('--fight-bar-height', bar.offsetHeight + 'px');
      }, 50);
    }

    function iniciarCountdown(fechaObj) {
      const el = document.getElementById("fight-countdown");
      if (!el) return;
      if (el._timer) clearInterval(el._timer);
      const tick = () => {
        const diff = fechaObj - new Date();
        if (diff <= 0) { el.textContent = "EN CURSO"; clearInterval(el._timer); return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
        const s = Math.floor((diff / 1000) % 60);
        el.textContent = `${d}d ${h}h ${m}m ${s}s`;
      };
      tick();
      el._timer = setInterval(tick, 1000);
    }

    function iniciarRotacion() {
      if (combates.length <= 1) return;
      intervalo = setInterval(() => {
        index = (index + 1) % combates.length;
        renderCombate(combates[index]);
      }, 8000);
    }

    renderCombate(combates[index]);
    iniciarRotacion();

  } catch (err) {
    console.error("Fight bar error:", err);
  }
}

// Abrir modal cartelera
function abrirCartelera(src) {
  const modal = document.getElementById('cartelera-modal');
  const img = document.getElementById('cartelera-img');
  if (!modal || !img) return;
  img.src = src;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Cerrar modal cartelera — expuesto global para onclick en HTML
window.cerrarCartelera = function() {
  const modal = document.getElementById('cartelera-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.cerrarCartelera();
});

cargarFightBar();

})();