// server.js
require('dotenv').config();
const http = require('http');
const app = require('./app'); // usa o app configurado no app.js
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Socket.IO com CORS e hardening
const io = new Server(server, {
  path: '/socket.io',
  cors: { origin: ['https://dea-rom.vercel.app'], methods: ['GET','POST'] },
  allowEIO3: false,
  perMessageDeflate: { threshold: 1024 } // evita compressão absurda
});

// opcional: autenticar as conexões
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
  if (!token) return next(new Error('unauthorized'));
  // validar token...
  next();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`UP na porta ${PORT}`);
});