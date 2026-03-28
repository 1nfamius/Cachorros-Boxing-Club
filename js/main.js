// Navbar cambia al hacer scroll

window.addEventListener("scroll", () => {

    const nav = document.querySelector("nav");

    if (window.scrollY > 50) {
        nav.style.background = "rgba(10,10,10,0.98)";
    } else {
        nav.style.background = "rgba(10,10,10,0.92)";
    }

});