const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/index');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

const defaultOrigins = [
  'https://coffetocodewaypointflow-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

const envOrigins = config.clientUrl
  ? config.clientUrl.split(',').map((url) => url.trim())
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless DB connection middleware (ensures Mongoose is connected on Vercel)
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/' || req.path === '/health' || req.path.startsWith('/socket.io')) {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return res.status(500).json({
      statusCode: 500,
      data: null,
      message: `Database connection error: ${error.message}`,
      success: false
    });
  }
});

// Graceful fallback for socket.io polling requests in serverless environments
app.use('/socket.io', (req, res) => {
  res.status(200).json({
    status: 'serverless_mode',
    message: 'Socket.IO is inactive on Vercel serverless. Frontend uses periodic sync fallback.',
    timestamp: new Date().toISOString()
  });
});

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
