// combates.js — Fight bar desde GitHub directamente

const GITHUB_USER = "1nfamius";
const GITHUB_REPO = "Cachorros-Boxing-Club";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "content/noticias";

const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${CONTENT_PATH}`;

function resolverImagen(ruta) {
  if (!ruta) return "";
  if (ruta.startsWith("http")) return ruta;
  const limpia = ruta.replace(/^\//, "");
  return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${limpia}`;
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
    const res = await fetch(API_URL);
    if (!res.ok) return;
    const archivos = await res.json();

    const mds = archivos.filter(f => f.name.endsWith(".md")).map(f => f.name);

    // Descarga y parsea todos los .md
    const todos = await Promise.all(mds.map(async nombre => {
      try {
        const r = await fetch(`${RAW_BASE}/${nombre}`);
        const texto = await r.text();
        return parsearFrontmatter(texto);
      } catch { return null; }
    }));

    // Filtra solo combates futuros (margen 24h para el día del combate)
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
    const container = document.getElementById("fight-bar-container");
    const cartelaImg = document.getElementById("cartelera-img");

    function renderCombate(c) {
      const diff = c.fechaObj - new Date();
      const esHoy = diff > -86400000 && diff <= 0;
      const esFuturo = diff > 0;

      const label = esHoy ? "🔥 HOY HAY COMBATE 🔥"
        : esFuturo ? "PRÓXIMA PELEA" : "COMBATE";
      
      const fechaTexto = c.fechaObj.toLocaleDateString("es-ES", {
        day: "numeric", month: "long"
      });

      const titulo = c.peleador && c.rival
        ? `${c.peleador} <span class="fight-vs">VS</span> ${c.rival}`
        : c.titulo || "";

      const imgCartelera = resolverImagen(c.cartelera || c.imagen);
      container.innerHTML = `
        <div class="fight-bar">
          <a href="${imgCartelera ? '#cartelera' : '#'}" class="fight-link">
            <span class="fight-label">${label}</span>
            <span class="fight-main">${titulo}</span>
            <span class="fight-extra">
              📍 ${c.lugar || ''} · 🗓️ ${fechaTexto} · 🕘 ${c.hora_combate || ''}
            </span>
            ${esFuturo ? `<span class="fight-countdown" id="countdown"></span>` : ''}
          </a>
        </div>
      `;

      if (cartelaImg) cartelaImg.src = imgCartelera;

      if (esFuturo) iniciarCountdown(c.fechaObj);
      
      document.body.classList.add('has-fight-bar');
    }

    function iniciarCountdown(fechaObj) {
      const el = document.getElementById("countdown");
      if (!el) return;
      if (el._timer) clearInterval(el._timer);
      const tick = () => {
        const diff = fechaObj - new Date();
        if (diff <= 0) { el.innerHTML = "🔥 EN CURSO 🔥"; clearInterval(el._timer); return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
        const s = Math.floor((diff / 1000) % 60);
        el.innerHTML = `⏳ ${d}d ${h}h ${m}m ${s}s`;
      };
      tick();
      el._timer = setInterval(tick, 1000);
    }

    renderCombate(combates[index]);

    if (combates.length > 1) {
      setInterval(() => {
        const prev = document.getElementById("countdown");
        if (prev?._timer) clearInterval(prev._timer);
        index = (index + 1) % combates.length;
        renderCombate(combates[index]);
      }, 8000);
    }

  } catch (err) {
    console.error("Fight bar error:", err);
  }
}

cargarFightBar();