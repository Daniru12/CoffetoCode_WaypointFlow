const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const apiRoutes = require('./routes/index');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(cors({ origin: config.clientUrl || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health / status endpoint
app.get('/', (req, res) => {
  res.send('CoffetoCode WaypointFlow API is running');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WaypointFlow Backend'
  });
});

// Mount All API v1 Routes
app.use('/api/v1', apiRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
