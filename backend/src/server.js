// src/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');             // usa o app configurado aqui
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Socket.IO (evita CORS solto e polling)
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: ['https://dea-rom.vercel.app'],
    methods: ['GET','POST'],
    credentials: true,
  },
  allowEIO3: false,
  perMessageDeflate: { threshold: 1024 },
});

// Graceful shutdown (o Railway manda SIGTERM em deploy/healthcheck)
const shutdown = (signal) => () => {
  console.log(`[${signal}] encerrando…`);
  server.close(() => {
    console.log('HTTP fechado.');
    // aqui: feche conexões do Firebird se precisar (pool.close)
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => console.log(`UP na porta ${PORT}`));