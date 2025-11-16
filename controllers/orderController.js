import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Stripe from "stripe";
import User from "../models/User.js";

// Place Order COD : /api/order/cod
export const placeOrderCOD = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, address } = req.body;

    if (!address || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    let amount = 0;
    const products = await Promise.all(
      items.map(item => Product.findById(item.product))
    );

    products.forEach((product, index) => {
      if (!product) throw new Error("Product not found");
      amount += product.offerPrice * items[index].quantity;
    });

    amount += Math.floor(amount * 0.02); // Add 2% tax

    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
      isPaid: true,
    });

    res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Place Order Stripe : /api/order/stripe
export const placeOrderStripe = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, address } = req.body;
    const { origin } = req.headers;

    if (!address || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    let productData = [];
    let amount = 0;

    const products = await Promise.all(
      items.map(item => Product.findById(item.product))
    );

    products.forEach((product, index) => {
      if (!product) throw new Error("Product not found");
      const quantity = items[index].quantity;
      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity,
      });
      amount += product.offerPrice * quantity;
    });

    amount += Math.floor(amount * 0.02); // Add 2% Tax

    const order = await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "Online",
      isPaid: false,
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = productData.map(item => ({
      price_data: {
        currency: "sgd",
        product_data: { name: item.name },
        unit_amount: Math.floor(item.price + item.price * 0.02) * 100,
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Stripe Webhooks : /api/order/stripe-webhook
export const stripeWebhooks = async (request, response) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Webhook received:", event.type);
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("✅ Checkout session completed for Order:", session.metadata.orderId);

      await Order.findByIdAndUpdate(session.metadata.orderId, { isPaid: true });
      await User.findByIdAndUpdate(session.metadata.userId, { cartItems: {} });
      break;
    }

    case "payment_intent.succeeded": {
      try {
        const paymentIntent = event.data.object;
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        const session = sessions.data[0];
        if (!session?.metadata?.orderId) {
          console.log("⚠️ No metadata found for payment_intent");
          break;
        }

        console.log("✅ PaymentIntent succeeded for Order:", session.metadata.orderId);
        await Order.findByIdAndUpdate(session.metadata.orderId, { isPaid: true });
        await User.findByIdAndUpdate(session.metadata.userId, { cartItems: {} });
      } catch (err) {
        console.error("❌ Error handling payment_intent.succeeded:", err.message);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
      });

      const failedOrderId = sessions.data[0].metadata.orderId;
      await Order.findByIdAndDelete(failedOrderId);
      break;
    }

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }

  response.json({ received: true });
};

// Get Orders by User ID : /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const orders = await Order.find({ userId })
      .populate("items.product address")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get All Orders (Admin) : /api/order/seller
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
