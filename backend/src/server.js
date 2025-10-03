// server.js — modo diagnóstico temporário
require('dotenv').config();
const http = require('http');
const express = require('express');
// const { Server } = require('socket.io'); // <-- comenta pra testar

const PORT = process.env.PORT || 3000;

const app = express();
app.set('trust proxy', 1);

// rota de saúde ANTES de qualquer coisa
app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// // Socket.IO comentado no teste
// const io = new Server(server, { path: '/socket.io' });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`UP na porta ${PORT}`);
});