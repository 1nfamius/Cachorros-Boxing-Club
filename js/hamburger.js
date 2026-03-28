// hamburger.js
// Controla el menú hamburguesa en móvil.
// Incluir en todas las páginas que usen el navbar compartido.

function initHamburger() {
  const btn = document.getElementById("hamburger-btn");
  const menu = document.getElementById("nav-mobile");

  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    btn.classList.toggle("open");
    menu.classList.toggle("open");
  });

  // Cierra el menú al hacer click en un enlace
  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      btn.classList.remove("open");
      menu.classList.remove("open");
    });
  });
}

document.addEventListener("DOMContentLoaded", initHamburger);