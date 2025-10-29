// routes/ticketsRoutes.js
const express = require('express');
const router = express.Router();

const { withDbActive } = require('../config/db'); // Firebird (read-only)
const { pool } = require('../config/mysql');

const {
  moverStatusTicket,
  listarAprovados,
  listarAguardandoPCP,
  listarRecusados,
  removerDoDashboard,
  listarAguardandoFinanceiro,
} = require('../controllers/ticketsController');

// --- helpers ---
const fail = (res, tag) => (err) => {
  console.error(`[${tag}]`, err);
  return res.status(500).json({ error: String(err) });
};

const toDias = (v, def = 30) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

const isNumericId = (v) => /^\d+$/.test(String(v));

// --- rotas ---

// Atualiza status do ticket
// POST /api/tickets/:codorc/status
router.post('/:codorc/status', (req, res) => {
  const { codorc } = req.params;
  const { status, username, motivo } = req.body || {};

  if (!isNumericId(codorc)) return res.status(400).json({ error: 'codorc inválido' });
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });
  if (!username) return res.status(400).json({ error: 'username é obrigatório' });

  moverStatusTicket({ codorc, status, username, motivo }, (err, out) => {
    if (err) return fail(res, 'moverStatusTicket')(err);
    return res.json(out);
  });
});

// Lista aprovados (últimos N dias)
// GET /api/tickets/aprovados?dias=30
router.get('/aprovados', (req, res) => {
  const dias = toDias(req.query.dias, 30);
  listarAprovados(dias, (err, rows) => {
    if (err) return fail(res, 'aprovados')(err);
    return res.json(rows || []);
  });
});

// Lista aguardando financeiro (últimos N dias)
// GET /api/tickets/aguardando-financeiro?dias=30
router.get('/aguardando-financeiro', (req, res) => {
  const dias = toDias(req.query.dias, 30);
  listarAguardandoFinanceiro(dias, (err, rows) => {
    if (err) return fail(res, 'aguardando-financeiro')(err);
    return res.json(rows || []);
  });
});

// Lista aguardando PCP
// GET /api/tickets/aguardando-pcp
router.get('/aguardando-pcp', (req, res) => {
  listarAguardandoPCP((err, rows) => {
    if (err) return fail(res, 'aguardando-pcp')(err);
    return res.json(rows || []);
  });
});

// Lista recusados
// GET /api/tickets/recusados
router.get('/recusados', (req, res) => {
  listarRecusados((err, rows) => {
    if (err) return fail(res, 'recusados')(err);
    return res.json(rows || []);
  });
});

// Health MySQL
// GET /api/tickets/health/mysql
router.get('/health/mysql', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true });
  } catch (e) {
    console.error('[mysql health]', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// Health Firebird
// GET /api/tickets/health/firebird
router.get('/health/firebird', (req, res) => {
  withDbActive((err, db) => {
    if (err) return res.status(500).json({ ok: false, error: String(err) });
    db.query('SELECT 1 FROM RDB$DATABASE', [], (e) => {
      db.detach();
      if (e) return res.status(500).json({ ok: false, error: String(e) });
      return res.json({ ok: true });
    });
  });
});

// Remove do dashboard
// DELETE /api/tickets/:codorc
router.delete('/:codorc', (req, res) => {
  const { codorc } = req.params;
  if (!isNumericId(codorc)) return res.status(400).json({ error: 'codorc inválido' });

  removerDoDashboard(codorc, (err, out) => {
    if (err) return fail(res, 'removerDoDashboard')(err);
    return res.json(out);
  });
});

module.exports = router;