require('dotenv').config();
const http = require('http');
const app = require('./app'); // usa o app configurado
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

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

// opcional: autenticação
io.use((socket, next) => {
  // validar token se você usa
  next();
});

// graceful shutdown (evita “morte seca” no deploy)
const shutdown = (signal) => () => {
  console.log(`[${signal}] encerrando…`);
  server.close(() => {
    console.log('HTTP fechado. Tchau!');
    process.exit(0);
  });
  // timer de segurança
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`UP na porta ${PORT}`);
});