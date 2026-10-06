const express = require('express');
const cors = require('cors');
const healthRoutes      = require('./routes/health.routes');
const productRoutes     = require('./routes/product.routes');
const inventoryRoutes   = require('./routes/inventory.routes');
const reservationRoutes = require('./routes/reservation.routes');
const checkoutRoutes    = require('./routes/checkout.routes');
const paymentRoutes     = require('./routes/payment.routes');
const orderRoutes       = require('./routes/order.routes');
const errorHandler      = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/inventory',    inventoryRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/checkout',     checkoutRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/orders',       orderRoutes);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
