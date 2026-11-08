
(function() {

const GITHUB_USER = "1nfamius";
const GITHUB_REPO = "Cachorros-Boxing-Club";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "content/noticias";

const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
const RAW_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${CONTENT_PATH}`;

let anuncios = [];
let index = 0;
let intervalo = null;

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

function formatearFecha(fecha) {
  if (!fecha) return "";

  const d = new Date(fecha + (fecha.length === 10 ? "T12:00:00" : ""));

  if (isNaN(d)) return "";

  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long"
  });
}

function escaparHTML(texto) {
  return String(texto || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

async function cargarAnuncios() {
  try {
    const res = await fetch(API_URL + `?_=${Date.now()}`);
    if (!res.ok) throw new Error("Error listando publicaciones");

    const archivos = await res.json();

    const mds = archivos
      .filter(f => f.name.endsWith(".md"))
      .map(f => f.name);

    const publicaciones = await Promise.all(
      mds.map(async nombre => {
        try {
          const r = await fetch(`${RAW_BASE}/${nombre}?_=${Date.now()}`);
          if (!r.ok) return null;

          const texto = await r.text();
          const data = parsearFrontmatter(texto);

          return data ? { ...data, archivo: nombre } : null;

        } catch {
          return null;
        }
      })
    );

    const ahora = new Date();

    const combates = publicaciones
      .filter(d => d && d.tipo === "combate" && d.fecha_combate)
      .map(d => ({
        ...d,
        fechaObj: new Date(
          d.fecha_combate + "T" + (d.hora_combate || "20:00")
        )
      }))
      .filter(c =>
        !isNaN(c.fechaObj) &&
        c.fechaObj >= new Date(ahora.getTime() - 86400000)
      )
      .map(d => ({ ...d, categoria: "combate" }));

    // Solo mostramos las 3 noticias más recientes
    const noticias = publicaciones
      .filter(d => d && d.tipo === "noticia" && d.fecha)
      .filter(d => !isNaN(new Date(d.fecha)))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 3)
      .map(d => ({
        ...d,
        categoria: "noticia",
        fechaObj: new Date(d.fecha + "T12:00:00")
      }));

    // Combinamos noticias y combates
    anuncios = [...combates, ...noticias];

    // Primero las publicaciones más recientes o próximas
    anuncios.sort((a, b) => b.fechaObj - a.fechaObj);

    if (!anuncios.length) return;

    iniciarBarra();

  } catch (err) {
    console.error("Announcement bar error:", err);
  }
}

function iniciarBarra() {
  const container = document.getElementById("fight-bar-container");
  if (!container) return;

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

  document.body.classList.add("has-fight-bar");

  ajustarOffset();
  window.addEventListener("resize", ajustarOffset);
  setTimeout(ajustarOffset, 300);

  renderAnuncio(anuncios[index]);
  renderDots();
  iniciarRotacion();
}

function ajustarOffset() {
  const bar = document.querySelector(".fight-bar");
  if (!bar) return;

  document.documentElement.style.setProperty(
    "--fight-bar-height",
    bar.offsetHeight + "px"
  );
}

function renderDots() {
  const dotsEl = document.getElementById("fight-dots");
  if (!dotsEl) return;

  if (anuncios.length <= 1) {
    dotsEl.innerHTML = "";
    return;
  }

  dotsEl.innerHTML = anuncios.map((_, i) => `
    <span class="fight-dot ${i === index ? "active" : ""}" data-i="${i}"></span>
  `).join("");

  dotsEl.querySelectorAll(".fight-dot").forEach(dot => {
    dot.addEventListener("click", e => {
      e.preventDefault();

      const i = parseInt(dot.dataset.i);
      if (i === index) return;

      clearInterval(intervalo);
      index = i;

      renderAnuncio(anuncios[index]);
      iniciarRotacion();
    });
  });
}

function renderAnuncio(anuncio) {
  if (!anuncio) return;

  const label = document.getElementById("fight-label");
  const main = document.getElementById("fight-main");
  const extra = document.getElementById("fight-extra");
  const countdown = document.getElementById("fight-countdown");
  const link = document.getElementById("fight-link");

  if (!label || !main || !extra || !countdown || !link) return;

  const esCombate = anuncio.categoria === "combate";

  // Reiniciamos los estilos de categoría
  const bar = document.querySelector(".fight-bar");
  bar.dataset.tipo = anuncio.categoria;

  if (esCombate) {
    renderCombate(anuncio, label, main, extra, countdown, link);
  } else {
    renderNoticia(anuncio, label, main, extra, countdown, link);
  }

  renderDots();
  ajustarOffset();
}

function renderCombate(c, label, main, extra, countdown, link) {
  const diff = c.fechaObj - new Date();

  const esHoy = diff > -86400000 && diff <= 0;
  const esFuturo = diff > 0;

  label.textContent = esHoy
    ? "HOY HAY COMBATE"
    : esFuturo
      ? "PRÓXIMA PELEA"
      : "COMBATE";

  const titulo = c.peleador && c.rival
    ? `${escaparHTML(c.peleador)} <span class="fight-vs">VS</span> ${escaparHTML(c.rival)}`
    : escaparHTML(c.titulo || "");

  main.innerHTML = titulo;

  extra.textContent =
    `${c.lugar || ""} · ${formatearFecha(c.fecha_combate)} · ${c.hora_combate || ""}`;

  const imgCartelera = resolverImagen(c.cartelera || c.imagen);

  link.href = "#";
  link.onclick = imgCartelera
    ? e => {
        e.preventDefault();
        abrirCartelera(imgCartelera);
      }
    : null;

  countdown.style.display = esFuturo ? "inline-flex" : "none";

  if (countdown._timer) {
    clearInterval(countdown._timer);
    countdown._timer = null;
  }

  if (esFuturo) iniciarCountdown(c.fechaObj);
}

function renderNoticia(n, label, main, extra, countdown, link) {
  label.textContent = "ÚLTIMA NOTICIA";

  main.textContent = n.titulo || "Nueva noticia";

  extra.textContent =
    n.resumen || formatearFecha(n.fecha);

  countdown.style.display = "none";

  if (countdown._timer) {
    clearInterval(countdown._timer);
    countdown._timer = null;
  }

  // Acceso a la sección de noticias
  link.href = "noticias.html";
  link.onclick = null;
}

function iniciarCountdown(fechaObj) {
  const el = document.getElementById("fight-countdown");
  if (!el) return;

  if (el._timer) clearInterval(el._timer);

  const tick = () => {
    const diff = fechaObj - new Date();

    if (diff <= 0) {
      el.textContent = "EN CURSO";
      clearInterval(el._timer);
      el._timer = null;
      return;
    }

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
  if (anuncios.length <= 1) return;

  intervalo = setInterval(() => {
    index = (index + 1) % anuncios.length;
    renderAnuncio(anuncios[index]);
  }, 8000);
}

// Modal cartelera
function abrirCartelera(src) {
  const modal = document.getElementById("cartelera-modal");
  const img = document.getElementById("cartelera-img");

  if (!modal || !img) return;

  img.src = src;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

window.cerrarCartelera = function() {
  const modal = document.getElementById("cartelera-modal");
  if (!modal) return;

(function() {

const GITHUB_USER = "1nfamius";
const GITHUB_REPO = "Cachorros-Boxing-Club";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "content/noticias";

const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
const RAW_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${CONTENT_PATH}`;

let anuncios = [];
let index = 0;
let intervalo = null;

// ==========================================
// UTILIDADES
// ==========================================

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

    const valor = linea.slice(sep + 2)
      .trim()
      .replace(/^"(.*)"$/, "$1");

    if (clave) data[clave] = valor;
  });

  return data;
}

function formatearFecha(fecha) {
  if (!fecha) return "";

  const d = new Date(
    fecha + (fecha.length === 10 ? "T12:00:00" : "")
  );

  if (isNaN(d)) return "";

  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long"
  });
}

function escaparHTML(texto) {
  return String(texto || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

// ==========================================
// CARGAR PUBLICACIONES
// ==========================================

async function cargarAnuncios() {

  try {

    const res = await fetch(API_URL + `?_=${Date.now()}`);

    if (!res.ok) {
      throw new Error("Error listando publicaciones");
    }

    const archivos = await res.json();

    const mds = archivos
      .filter(f => f.name.endsWith(".md"))
      .map(f => f.name);

    const publicaciones = await Promise.all(
      mds.map(async nombre => {

        try {

          const r = await fetch(`${RAW_BASE}/${nombre}?_=${Date.now()}`);

          if (!r.ok) return null;

          const texto = await r.text();

          const data = parsearFrontmatter(texto);

          return data ? { ...data, archivo: nombre } : null;

        } catch {
          return null;
        }

      })
    );

    const ahora = new Date();

    // --------------------------------------
    // COMBATES
    // --------------------------------------

    const combates = publicaciones

      .filter(d =>
        d &&
        d.tipo === "combate" &&
        d.fecha_combate
      )

      .map(d => ({
        ...d,
        categoria: "combate",
        fechaObj: new Date(
          d.fecha_combate + "T" + (d.hora_combate || "20:00")
        )
      }))

      .filter(c =>
        !isNaN(c.fechaObj) &&
        c.fechaObj >= new Date(ahora.getTime() - 86400000)
      );

    // --------------------------------------
    // NOTICIAS
    // --------------------------------------

const ahora = new Date();

const haceSieteDias = new Date(ahora);
haceSieteDias.setDate(ahora.getDate() - 7);

const noticias = publicaciones

  .filter(d =>
    d &&
    d.tipo === "noticia" &&
    d.fecha
  )

  .map(d => ({
    ...d,
    fechaObj: new Date(d.fecha + "T12:00:00")
  }))

  // Solo noticias publicadas en los últimos 7 días
  .filter(d =>
    !isNaN(d.fechaObj) &&
    d.fechaObj >= haceSieteDias &&
    d.fechaObj <= ahora
  )

  .sort((a, b) =>
    b.fechaObj - a.fechaObj
  )

  .slice(0, 3)

  .map(d => ({
    ...d,
    categoria: "noticia"
  }));

    // --------------------------------------
    // COMBINAR ANUNCIOS
    // --------------------------------------

    anuncios = [...combates, ...noticias];

    anuncios.sort((a, b) => {

      // Combates: primero los más próximos
      if (
        a.categoria === "combate" &&
        b.categoria === "combate"
      ) {
        return a.fechaObj - b.fechaObj;
      }

      // Noticias: primero las más recientes
      if (
        a.categoria === "noticia" &&
        b.categoria === "noticia"
      ) {
        return b.fechaObj - a.fechaObj;
      }

      // Prioridad visual para los combates
      return a.categoria === "combate" ? -1 : 1;

    });

    if (!anuncios.length) return;

    iniciarBarra();

  } catch (err) {

    console.error("Announcement bar error:", err);

  }

}

// ==========================================
// INICIAR BARRA
// ==========================================

function iniciarBarra() {

  const container = document.getElementById("fight-bar-container");

  if (!container) return;

  container.innerHTML = `
    <div class="fight-bar">

      <a id="fight-link" href="#" class="fight-link">

        <span id="fight-label" class="fight-label"></span>

        <span id="fight-main" class="fight-main"></span>

        <span id="fight-extra" class="fight-extra"></span>

        <span
          id="fight-countdown"
          class="fight-countdown"
          style="display:none"
        ></span>

      </a>

      <div id="fight-dots" class="fight-dots"></div>

    </div>
  `;

  document.body.classList.add("has-fight-bar");

  ajustarOffset();

  window.addEventListener("resize", ajustarOffset);

  setTimeout(ajustarOffset, 300);

  renderAnuncio(anuncios[index]);

  iniciarRotacion();

}

// ==========================================
// AJUSTAR ALTURA DE LA BARRA
// ==========================================

function ajustarOffset() {

  const bar = document.querySelector(".fight-bar");

  if (!bar) return;

  document.documentElement.style.setProperty(
    "--fight-bar-height",
    bar.offsetHeight + "px"
  );

}

// ==========================================
// INDICADORES DE NAVEGACIÓN
// ==========================================

function renderDots() {

  const dotsEl = document.getElementById("fight-dots");

  if (!dotsEl) return;

  if (anuncios.length <= 1) {
    dotsEl.innerHTML = "";
    return;
  }

  dotsEl.innerHTML = anuncios.map((_, i) => `
    <span
      class="fight-dot ${i === index ? "active" : ""}"
      data-i="${i}"
    ></span>
  `).join("");

  dotsEl.querySelectorAll(".fight-dot").forEach(dot => {

    dot.addEventListener("click", e => {

      e.preventDefault();

      const i = parseInt(dot.dataset.i);

      if (i === index) return;

      clearInterval(intervalo);

      index = i;

      renderAnuncio(anuncios[index]);

      iniciarRotacion();

    });

  });

}

// ==========================================
// RENDERIZAR ANUNCIO
// ==========================================

function renderAnuncio(anuncio) {

  if (!anuncio) return;

  const label = document.getElementById("fight-label");
  const main = document.getElementById("fight-main");
  const extra = document.getElementById("fight-extra");
  const countdown = document.getElementById("fight-countdown");
  const link = document.getElementById("fight-link");

  if (!label || !main || !extra || !countdown || !link) return;

  const bar = document.querySelector(".fight-bar");

  if (bar) {
    bar.dataset.tipo = anuncio.categoria;
  }

  if (anuncio.categoria === "combate") {

    renderCombate(
      anuncio,
      label,
      main,
      extra,
      countdown,
      link
    );

  } else {

    renderNoticia(
      anuncio,
      label,
      main,
      extra,
      countdown,
      link
    );

  }

  renderDots();

  ajustarOffset();

}

// ==========================================
// RENDERIZAR COMBATE
// ==========================================

function renderCombate(c, label, main, extra, countdown, link) {

  const diff = c.fechaObj - new Date();

  const esHoy = diff > -86400000 && diff <= 0;

  const esFuturo = diff > 0;

  label.textContent = esHoy
    ? "HOY HAY COMBATE"
    : esFuturo
      ? "PRÓXIMA PELEA"
      : "COMBATE";

  const titulo = c.peleador && c.rival

    ? `${escaparHTML(c.peleador)}
       <span class="fight-vs">VS</span>
       ${escaparHTML(c.rival)}`

    : escaparHTML(c.titulo || "");

  main.innerHTML = titulo;

  extra.textContent =
    `${c.lugar || ""} · ${formatearFecha(c.fecha_combate)} · ${c.hora_combate || ""}`;

  const imgCartelera = resolverImagen(
    c.cartelera || c.imagen
  );

  link.href = "#";

  link.onclick = imgCartelera

    ? e => {
        e.preventDefault();
        abrirCartelera(imgCartelera);
      }

    : null;

  countdown.style.display = esFuturo
    ? "inline-flex"
    : "none";

  if (countdown._timer) {
    clearInterval(countdown._timer);
    countdown._timer = null;
  }

  if (esFuturo) {
    iniciarCountdown(c.fechaObj);
  }

}

// ==========================================
// RENDERIZAR NOTICIA
// ==========================================

function renderNoticia(n, label, main, extra, countdown, link) {

  label.textContent = "ÚLTIMA NOTICIA";

  main.textContent = n.titulo || "Nueva noticia";

  extra.textContent =
    n.resumen || formatearFecha(n.fecha);

  countdown.style.display = "none";

  if (countdown._timer) {
    clearInterval(countdown._timer);
    countdown._timer = null;
  }

  link.href = "noticias.html";

  link.onclick = null;

}

// ==========================================
// CUENTA ATRÁS
// ==========================================

function iniciarCountdown(fechaObj) {

  const el = document.getElementById("fight-countdown");

  if (!el) return;

  if (el._timer) clearInterval(el._timer);

  const tick = () => {

    const diff = fechaObj - new Date();

    if (diff <= 0) {

      el.textContent = "EN CURSO";

      clearInterval(el._timer);

      el._timer = null;

      return;

    }

    const d = Math.floor(diff / 86400000);

    const h = Math.floor((diff / 3600000) % 24);

    const m = Math.floor((diff / 60000) % 60);

    const s = Math.floor((diff / 1000) % 60);

    el.textContent = `${d}d ${h}h ${m}m ${s}s`;

  };

  tick();

  el._timer = setInterval(tick, 1000);

}

// ==========================================
// ROTACIÓN AUTOMÁTICA
// ==========================================

function iniciarRotacion() {

  if (anuncios.length <= 1) return;

  intervalo = setInterval(() => {

    index = (index + 1) % anuncios.length;

    renderAnuncio(anuncios[index]);

  }, 8000);

}

// ==========================================
// MODAL CARTELERA
// ==========================================

function abrirCartelera(src) {

  const modal = document.getElementById("cartelera-modal");

  const img = document.getElementById("cartelera-img");

  if (!modal || !img) return;

  img.src = src;

  modal.classList.add("open");

  document.body.style.overflow = "hidden";

}

// ==========================================
// CERRAR MODAL
// ==========================================

window.cerrarCartelera = function() {

  const modal = document.getElementById("cartelera-modal");

  if (!modal) return;

  modal.classList.remove("open");

  document.body.style.overflow = "";

};

document.addEventListener("keydown", e => {

  if (e.key === "Escape") {
    window.cerrarCartelera();
  }

});

// ==========================================
// INICIAR SISTEMA
// ==========================================

cargarAnuncios();

})();

  modal.classList.remove("open");
  document.body.style.overflow = "";
};

document.addEventListener("keydown", e => {
  if (e.key === "Escape") window.cerrarCartelera();
});

cargarAnuncios();

})();
