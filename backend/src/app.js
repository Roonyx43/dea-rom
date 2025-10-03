// app.js
const express = require('express');
const cors = require('cors');

const app = express();

// ✅ CORS precisa vir antes das rotas
app.use(cors({
  origin: 'https://dea-rom.vercel.app', // seu frontend
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

const tabelaRoutes = require('./routes/tabelaRoutes');
app.use('/api', tabelaRoutes);

const ticketsRoutes = require('./routes/ticketsRoutes');
app.use('/api', ticketsRoutes)

module.exports = app;