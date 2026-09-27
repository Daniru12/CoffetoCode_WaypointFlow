const express = require('express');
const cors = require('cors');
const config = require('./config/env');

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route to test the server
app.get('/', (req, res) => {
  res.send('CoffetoCode WaypointFlow API is running');
});

// Import routes here later
// const routes = require('./routes');
// app.use('/api/v1', routes);

module.exports = app;
