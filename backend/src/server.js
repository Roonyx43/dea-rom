// server.js (teste temporário)
require('dotenv').config();
const http = require('http');
const cors = require('cors');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

// allowedOrigins igual ao seu atual...
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173','https://dea-rom.vercel.app');
}

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
});

const app = express();
app.set('trust proxy', 1);
app.use(corsMiddleware);
app.use(express.json());
app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io',
  cors: { origin(origin, cb){ if(!origin||allowedOrigins.includes(origin)) return cb(null,true); return cb(new Error(`Socket CORS: ${origin}`)); }, credentials: true },
});
io.on('connection', s => { console.log('[socket] conectado', s.id); });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`UP na porta ${PORT}`);
  console.log('Allowed Origins:', allowedOrigins.join(', '));
});