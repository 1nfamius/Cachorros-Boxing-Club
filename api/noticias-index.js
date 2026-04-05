// api/noticias-index.js
// Vercel Function que lee la carpeta /content/noticias/
// y devuelve un array con los nombres de los archivos .md
// La web lo usa para saber qué noticias cargar.

const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  try {
    const dir = path.join(process.cwd(), "content", "noticias");

    if (!fs.existsSync(dir)) {
      return res.status(200).json([]);
    }

    const archivos = fs.readdirSync(dir)
      .filter(f => f.endsWith(".md"))
      .sort()
      .reverse(); // más reciente primero

    res.status(200).json(archivos);
  } catch (err) {
    res.status(500).json({ error: "Error leyendo noticias" });
  }
};