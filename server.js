import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';

import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';

const app = express();
const port = process.env.PORT || 4000;
const baseurl=process.env.BASE_URL;
await connectDB();
await connectCloudinary();

//  Allow frontend origin
const allowedOrigins = ['http://localhost:5173',baseurl]

//  Stripe webhook route MUST be defined BEFORE express.json() 
app.post(
  '/api/order/stripe-webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhooks
);

//  Middleware (after webhook to avoid breaking stripe raw body)
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json()); 
app.use(cookieParser());

//  Routes
app.get('/', (req, res) => res.send('API is Working'));
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

//  Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
