// api/checkout.js
// Vercel Function que recibe el carrito y crea una sesión de pago en Stripe.
// Esta función se ejecuta en el servidor, nunca en el navegador del usuario.
// La clave secreta de Stripe está segura aquí.

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {

  // Solo aceptamos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { cart } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: "El carrito está vacío" });
  }

  try {
    // Convertimos cada item del carrito al formato que espera Stripe
    const line_items = cart.map(item => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.nombre,
          // Añadimos talla y color como descripción del producto
          description: [
            item.talla !== "unica" ? `Talla: ${item.talla}` : null,
            item.color ? `Color: ${item.color}` : null
          ].filter(Boolean).join(" · "),
        },
        // Stripe trabaja en céntimos, multiplicamos por 100
        unit_amount: Math.round(item.precio * 100),
      },
      quantity: item.qty,
    }));

    // Creamos la sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      // Stripe redirige aquí cuando el pago es correcto
      success_url: `${process.env.NEXT_PUBLIC_URL}/tienda\success.html`,
      // Stripe redirige aquí si el usuario cancela
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/`,
      // Stripe genera la factura automáticamente
      invoice_creation: { enabled: true },
    });

    // Devolvemos la URL de pago al frontend
    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("Error de Stripe:", error);
    res.status(500).json({ error: "Error al crear la sesión de pago" });
  }
};