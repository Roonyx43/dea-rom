const express = require('express')
const router = express.Router()
const { withDbActive } = require('../config/db');        // Firebird (read-only)
const { pool }   = require('../config/mysql');

const {
  moverStatusTicket,
  listarAprovados,
  listarAguardandoPCP,
  listarRecusados,
  removerDoDashboard,
  listarAguardandoFinanceiro,   // <— ADICIONE
} = require('../controllers/ticketsController')

router.post('/tickets/:codorc/status', (req, res) => {
  const { codorc } = req.params
  const { status, username, motivo } = req.body || {}
  moverStatusTicket({ codorc, status, username, motivo }, (err, out) => {
    if (err) return res.status(500).json({ error: String(err) })
    res.json(out)
  })
})

router.get('/aprovados', (req, res) => {
  const dias = parseInt(req.query.dias || 30) || 30;
  listarAprovados(dias, (err, rows) => {
    if (err) {
      console.error('[aprovados] erro:', err);
      return res.status(500).json({ error: String(err) });
    }
    res.json(rows || []);
  });
});

router.get('/aguardando-financeiro', (req, res) => {
  const dias = parseInt(req.query.dias || 30) || 30;
  listarAguardandoFinanceiro(dias, (err, rows) => {
    if (err) {
      console.error('[aguardando-financeiro] erro:', err);
      return res.status(500).json({ error: String(err) });
    }
    res.json(rows || []);
  });
});

router.get('/aguardando-pcp', (req, res) => {
  listarAguardandoPCP((err, rows) => {
    if (err) return res.status(500).json({ error: String(err) })
    res.json(rows || [])
  })
})

router.get('/health/mysql', async (req,res)=>{
  try { await pool.query('SELECT 1'); res.json({ok:true}) }
  catch(e){ console.error('[mysql health]', e); res.status(500).json({ok:false, error:String(e)}) }
});

router.get('/health/firebird', (req,res)=>{
  withDbActive((err, db)=>{
    if (err) return res.status(500).json({ok:false, error:String(err)});
    db.query('SELECT 1 FROM RDB$DATABASE', [], (e)=> { db.detach(); e ? res.status(500).json({ok:false, error:String(e)}) : res.json({ok:true}); });
  });
});

router.get('/recusados', (req, res) => {
  listarRecusados((err, rows) => {
    if (err) return res.status(500).json({ error: String(err) })
    res.json(rows || [])
  })
})

router.delete('/tickets/:codorc', (req, res) => {
  const { codorc } = req.params
  removerDoDashboard(codorc, (err, out) => {
    if (err) return res.status(500).json({ error: String(err) })
    res.json(out)
  })
})

module.exports = router
