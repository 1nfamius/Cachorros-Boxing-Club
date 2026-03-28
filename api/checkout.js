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
          description: [
            item.talla !== "unica" ? `Talla: ${item.talla}` : null,
            item.color ? `Color: ${item.color}` : null
          ].filter(Boolean).join(" · "),
        },
        unit_amount: Math.round(item.precio * 100),
        tax_behavior: "inclusive", // ← esto es lo que falta
      },
      quantity: item.qty,
    }));

    // Creamos la sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["ES"],
      },
      automatic_tax: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_URL}/tienda/success.html`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/tienda/index.html`,
      invoice_creation: { enabled: true },
    });

    // Devolvemos la URL de pago al frontend
    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("Error de Stripe:", error);
    res.status(500).json({ error: "Error al crear la sesión de pago" });
  }
};