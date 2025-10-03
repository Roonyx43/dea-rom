// server.js
require('dotenv').config();
const http = require('http');
const cors = require('cors');
const app = require('./app');
const { Server } = require('socket.io');
const { setupTabelaSocket } = require('./middlewares/tabelaSocket');

const PORT = process.env.PORT || 3000;

// ----- Origens permitidas (env ou defaults) -----
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  // defaults seguros p/ dev e produção
  allowedOrigins.push(
    'http://localhost:5173',
    'https://dea-rom.vercel.app'
  );
}

// ----- CORS middleware (Express) -----
const corsMiddleware = cors({
  origin(origin, callback) {
    // Permite requests sem Origin (curl/SSR/health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true, // necessário p/ cookies/headers auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Se estiver atrás de proxy (Railway), necessário p/ cookies Secure
app.set('trust proxy', 1);

// Aplica CORS no Express e garante preflight
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);

// ----- HTTP server + Socket.IO -----
const server = http.createServer(app);

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS bloqueado: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Eventos do Socket
setupTabelaSocket(io);

// Start
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Allowed Origins:', allowedOrigins.join(', '));
});