// cart.js
// Lógica del carrito. Maneja los datos, no toca el HTML directamente.
// Cada item del carrito incluye talla y color elegidos por el usuario.

let cart = [];

// Añade un producto al carrito con su talla y color seleccionados.
// Si ya existe el mismo producto con la misma talla y color, sube la cantidad.
// Si no, lo añade como item nuevo.
function addToCart(product, talla, color) {
  const key = `${product.id}-${talla}-${color}`;
  const existing = cart.find(i => i.key === key);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      key,
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagen: product.imagenes[0],
      talla,
      color,
      qty: 1
    });
  }

  updateCart();
}

// Quita una unidad. Si llega a 0, elimina el item.
function removeFromCart(key) {
  const existing = cart.find(i => i.key === key);

  if (existing.qty > 1) {
    existing.qty--;
  } else {
    cart = cart.filter(i => i.key !== key);
  }

  updateCart();
}

// Vacía el carrito entero
function clearCart() {
  cart = [];
  updateCart();
}

// Abre y cierra el panel lateral del carrito
function toggleCart() {
  document.getElementById("cart-panel").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("open");
}

// Recalcula contador y total, luego actualiza el HTML del carrito
function updateCart() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const total = cart.reduce((sum, i) => sum + i.precio * i.qty, 0);

  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-total").textContent = total.toFixed(2) + " €";

  renderCart();
}

// Llama a la Vercel Function /api/checkout con el carrito actual
async function checkout() {
  if (cart.length === 0) return;

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart })
    });

    const data = await res.json();

    // Stripe devuelve una URL, redirigimos al usuario ahí
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("Error al iniciar el pago:", err);
  }
}