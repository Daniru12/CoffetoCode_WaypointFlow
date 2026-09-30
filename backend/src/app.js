const express = require('express');
const cors = require('cors');
const config = require('./config/env');

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const outletRoutes = require('./modules/outlets/outlet.routes');
const vehicleRoutes = require('./modules/vehicles/vehicle.routes');
const orderRoutes = require('./modules/orders/order.routes');
const errorHandler = require('./middlewares/error.middleware');

// Basic route to test the server
app.get('/', (req, res) => {
  res.send('CoffetoCode WaypointFlow API is running');
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/outlets', outletRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/orders', orderRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

