// src/routes/entregadorRoutes.js
const express = require('express');
const router = express.Router();
const mysqlPool = require('../config/mysql');

router.get('/entregadores-bairros', async (req, res) => {
  try {
    const [rows] = await mysqlPool.query('SELECT bairro, entregador FROM entregador_bairro');
    const mapa = {};
    rows.forEach(row => {
      mapa[row.bairro.trim()] = row.entregador;
    });
    res.json(mapa);
  } catch (err) {
    console.error('Erro MySQL:', err);
    res.status(500).json({ error: 'Erro ao buscar entregadores/bairros' });
  }
});

module.exports = router;
