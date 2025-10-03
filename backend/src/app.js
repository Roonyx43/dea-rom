// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

const allowedOrigins = ['http://localhost:5173', 'https://dea-rom.vercel.app']

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);

app.use(express.json());
app.use(helmet());

// ⚠️ Healthcheck independente do DB (não chame Firebird aqui)
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

// Prefixos distintos
app.use('/api/tabelas', require('./routes/tabelaRoutes'));
app.use('/api/tickets', require('./routes/ticketsRoutes'));

// 404 e erro central
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal error' });
});

module.exports = app;