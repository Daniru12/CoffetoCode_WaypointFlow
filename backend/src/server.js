const http = require('http');
const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');

const server = http.createServer(app);

// Initialize Socket.IO with HTTP server
initSocket(server);

// Start server and connect to database
server.listen(config.port, () => {
  console.log(`Server running in ${config.env} mode on port ${config.port}`);
  connectDB();
});

module.exports = server;
