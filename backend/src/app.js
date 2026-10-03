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
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        origin.startsWith('http://localhost');
      if (isAllowed) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless DB connection middleware (ensures Mongoose is connected on Vercel)
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/health') {
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
