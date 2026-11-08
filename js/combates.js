(function () {
  // ======================================
  // CONFIG
  // ======================================
  const GITHUB_USER = "1nfamius";
  const GITHUB_REPO = "Cachorros-Boxing-Club";
  const GITHUB_BRANCH = "main";
  const CONTENT_PATH = "content/noticias";

  const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
  // raw.githubusercontent se refresca en ~5 min (jsDelivr puede tardar horas con @main)
  const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${CONTENT_PATH}`;

  const DIAS_NOTICIA = 7;        // días que una noticia está en la barra
  const MAX_ITEMS = 3;           // máximo de anuncios en la barra
  const ROTACION_MS = 6000;      // cambio automático de anuncio
  const CACHE_MIN = 5;           // minutos de caché en sessionStorage
  const CACHE_KEY = "cbc_publicaciones_v1";

  let items = [];
  let indice = 0;
  let timerRotacion = null;

  // ======================================
  // UTILIDADES
  // ======================================
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function parseFecha(valor, hora) {
    if (!valor) return null;
    const s = String(valor).trim();
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      let h = "00:00";
      if (hora && /^\d{1,2}:\d{2}$/.test(String(hora).trim())) {
        h = String(hora).trim().padStart(5, "0");
      }
      d = new Date(`${s}T${h}:00`);
    } else {
      d = new Date(s);
    }
    return isNaN(d) ? null : d;
  }

  function formatearFecha(d) {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  }

  function resolverImagen(ruta) {
    if (!ruta) return "";
    if (/^https?:/.test(ruta)) return ruta;
    return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${ruta.replace(/^\//, "")}`;
  }

  function parsearMarkdown(texto, archivo) {
    const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) return null;
    const pub = { archivo: archivo.replace(/\.md$/, "") };
    match[1].split(/\r?\n/).forEach(linea => {
      const i = linea.indexOf(": ");
      if (i === -1) return;
      const clave = linea.slice(0, i).trim();
      const valor = linea.slice(i + 2).trim().replace(/^["'](.*)["']$/, "$1");
      if (clave) pub[clave] = valor;
    });
    return pub;
  }

  // ======================================
  // CARGA DE DATOS (con caché para no agotar la API de GitHub)
  // ======================================
  async function cargarPublicaciones() {
    try {
      const guardado = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (guardado && Date.now() - guardado.t < CACHE_MIN * 60000) return guardado.data;
    } catch (_) {}

    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("No se pudo listar el contenido");
    const archivos = await res.json();

    const pubs = await Promise.all(
      archivos
        .filter(f => f.name.endsWith(".md"))
        .map(async f => {
          try {
            const r = await fetch(`${RAW_BASE}/${encodeURIComponent(f.name)}`);
            if (!r.ok) return null;
            return parsearMarkdown(await r.text(), f.name);
          } catch (_) { return null; }
        })
    );

    const data = pubs.filter(Boolean);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (_) {}
    return data;
  }

  // ======================================
  // CONSTRUIR LISTA DE LA BARRA
  // ======================================
  function construirItems(publicaciones, ahora) {
    // --- COMBATES: visibles desde su publicación hasta la hora del combate ---
    const combates = publicaciones
      .filter(p => p && p.tipo === "combate")
      .map(p => {
        const fin = parseFecha(p.fecha_combate || p.fecha, p.hora_combate || "23:59");
        const inicio = parseFecha(p.fecha);
        return fin ? { ...p, categoria: "combate", inicio, fin } : null;
      })
      .filter(p => p && p.fin > ahora && (!p.inicio || p.inicio <= ahora))
      .sort((a, b) => a.fin - b.fin);

    // --- NOTICIAS: 7 días desde la fecha de publicación ---
    const noticias = publicaciones
      .filter(p => p && p.tipo === "noticia")
      .map(p => {
        const inicio = parseFecha(p.fecha);
        if (!inicio) return null;
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + DIAS_NOTICIA);
        return { ...p, categoria: "noticia", inicio, fin };
      })
      .filter(p => p && p.inicio <= ahora && ahora < p.fin)
      .sort((a, b) => b.inicio - a.inicio);

    // Combates primero (prioridad), luego noticias
    return [...combates, ...noticias].slice(0, MAX_ITEMS);
  }

  // ======================================
  // RENDER (usa las clases de styles.css)
  // ======================================
  function cuentaAtras(ms) {
    if (ms <= 0) return "¡YA!";
    const min = Math.floor(ms / 60000);
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function actualizarCuentas() {
    document.querySelectorAll(".fight-countdown[data-fin]").forEach(el => {
      el.textContent = cuentaAtras(Number(el.dataset.fin) - Date.now());
    });
  }

  function textoCuando(item, ahora) {
    const d = item.fin;
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    const dia = d.toDateString() === ahora.toDateString() ? "Hoy"
      : d.toDateString() === manana.toDateString() ? "Mañana"
      : formatearFecha(d);
    const hora = (item.hora_combate || "").trim();
    return hora ? `${dia} · ${esc(hora)}` : dia;
  }

  function htmlItem(item, ahora) {
    if (item.categoria === "combate") {
      const cartelera = resolverImagen(item.cartelera);
      const vs = (item.peleador || item.rival)
        ? `${esc(item.peleador || "?")} <span class="fight-vs">VS</span> ${esc(item.rival || "?")}`
        : esc(item.titulo || "Próximo combate");
      const extra = [item.lugar ? esc(item.lugar) : "", textoCuando(item, ahora)]
        .filter(Boolean).join(" · ");

      const attrs = cartelera
        ? `href="#" data-img="${esc(cartelera)}" onclick="abrirCartelera(this.dataset.img); return false;"`
        : `href="/noticias#${encodeURIComponent(item.archivo)}"`;

      return `
        <a class="fight-link" ${attrs}>
          <span class="fight-label">🥊 COMBATE</span>
          <span class="fight-main">${vs}</span>
          <span class="fight-extra">${extra}</span>
          <span class="fight-countdown" data-fin="${item.fin.getTime()}"></span>
        </a>`;
    }

    // NOTICIA
    const img = resolverImagen(item.imagen);
    const attrs = img
      ? `href="#" data-img="${esc(img)}" onclick="abrirCartelera(this.dataset.img); return false;"`
      : `href="/noticias#${encodeURIComponent(item.archivo)}"`;

    return `
      <a class="fight-link" ${attrs}>
        <span class="fight-label">📰 NOTICIA</span>
        <span class="fight-main">${esc(item.titulo || "Nueva noticia")}</span>
        ${item.resumen ? `<span class="fight-extra">${esc(item.resumen)}</span>` : ""}
      </a>`;
  }

  function pintar() {
    const cont = document.getElementById("fight-bar-container");
    if (!cont) return;

    const ahora = new Date();
    items = items.filter(i => i.fin > ahora); // quita lo caducado sin recargar

    if (items.length === 0) {
      cont.innerHTML = "";
      document.body.classList.remove("has-fight-bar");
      clearInterval(timerRotacion);
      return;
    }
    if (indice >= items.length) indice = 0;

    const dots = items.length > 1
      ? `<div class="fight-dots">${items.map((_, i) =>
          `<span class="fight-dot${i === indice ? " active" : ""}" onclick="fightBarIr(${i})"></span>`
        ).join("")}</div>`
      : "";

    cont.innerHTML = `<div class="fight-bar">${htmlItem(items[indice], ahora)}${dots}</div>`;
    document.body.classList.add("has-fight-bar");
    actualizarCuentas();
  }

  function iniciarRotacion() {
    clearInterval(timerRotacion);
    if (items.length < 2) return;
    timerRotacion = setInterval(() => {
      indice = (indice + 1) % items.length;
      pintar();
    }, ROTACION_MS);
  }

  window.fightBarIr = function (i) {
    indice = i;
    pintar();
    iniciarRotacion();
  };

  // ======================================
  // MODAL DE CARTELERA (tu CSS usa .open)
  // ======================================
  window.abrirCartelera = function (src) {
    const modal = document.getElementById("cartelera-modal");
    const img = document.getElementById("cartelera-img");
    if (!modal || !img) return;
    img.src = src;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  window.cerrarCartelera = function () {
    const modal = document.getElementById("cartelera-modal");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  };

  // ======================================
  // INIT
  // ======================================
  async function init() {
    try {
      const publicaciones = await cargarPublicaciones();
      items = construirItems(publicaciones, new Date());
      pintar();
      iniciarRotacion();
      setInterval(pintar, 60000);         // quita lo que caduque
      setInterval(actualizarCuentas, 30000); // refresca cuentas atrás
    } catch (err) {
      console.error("Fight bar:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();