// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(express.json({ limit: '200kb' }));
app.use(cors());

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