// routes/tabelaRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tabelaController');

// --- helpers ---
const fail = (res, tag) => (err) => {
  console.error(`[${tag}]`, err);
  return res.status(500).json({ error: String(err?.message || err) });
};

// parseia ?dias=, aplica default, mínimo e máximo
const toDias = (v, def = 30, { min = 1, max = 365 } = {}) => {
  if (v === undefined || v === null || v === '') return def;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
};

// GET /api/tabela/orcamentos-unificado?dias=30
router.get('/orcamentos-unificado', (req, res) => {
  const dias = toDias(req.query.dias, 30);
  ctrl.buscarOrcamentosUnificadoPorDias(dias, (err, rows) => {
    if (err) return fail(res, 'orcamentos-unificado')(err);
    return res.json(rows || []);
  });
});

// GET /api/tabela/orcamentos-hoje  (default: 1 dia; permite override com ?dias=)
router.get('/orcamentos-hoje', (req, res) => {
  const dias = req.query.dias === undefined
    ? 1
    : toDias(req.query.dias, 1);
  ctrl.buscarCadastradosPorDias(dias, (err, rows) => {
    if (err) return fail(res, 'orcamentos-hoje')(err);
    return res.json(rows || []);
  });
});

// GET /api/tabela/orcamentos-aguardando-financeiro?dias=30
router.get('/orcamentos-aguardando-financeiro', (req, res) => {
  const dias = toDias(req.query.dias, 30);
  ctrl.buscarAguardandoFinanceiroPorDias(dias, (err, rows) => {
    if (err) return fail(res, 'orcamentos-aguardando-financeiro')(err);
    return res.json(rows || []);
  });
});

module.exports = router;
