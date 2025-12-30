// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(express.json({ limit: '200kb' }));
app.use(cors({
  origin: ['https://dea-rom.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// ⚠️ Healthcheck independente do DB
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

// Rotas de API
app.use('/api/auth', require('./routes/authRoutes'));   // 👈 AQUI
app.use('/api/tickets', require('./routes/ticketsRoutes'));
app.use('/api/tabela',  require('./routes/tabelaRoutes'));
app.use('/api/estoque', require('./routes/estoqueRoutes'));
app.use('/api/entregadores', require('./routes/entregadoresRoutes'))
app.use('/api/dashboard-vendas', require('./routes/DashboardVendasRoutes'));

// 404 e erro central
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal error' });
});

module.exports = app;