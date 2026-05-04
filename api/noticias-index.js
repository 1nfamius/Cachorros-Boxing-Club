// api/combates-index.js
// Devuelve solo las noticias de tipo "combate" con sus campos parseados
const fs = require("fs");
const path = require("path");

function parseFrontmatter(texto) {
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  match[1].split("\n").forEach(linea => {
    const [clave, ...valor] = linea.split(": ");
    if (clave && valor.length) {
      data[clave.trim()] = valor.join(": ").trim().replace(/^"(.*)"$/, "$1");
    }
  });
  return data;
}

module.exports = (req, res) => {
  try {
    const dir = path.join(process.cwd(), "content", "noticias");
    if (!fs.existsSync(dir)) {
      return res.status(200).json([]);
    }
    const archivos = fs.readdirSync(dir)
      .filter(f => f.endsWith(".md"))
      .sort()
      .reverse();

    // Asegura que devuelve solo strings
    res.status(200).json(archivos.map(f => String(f)));
  } catch (err) {
    res.status(500).json({ error: "Error leyendo noticias" });
  }
};