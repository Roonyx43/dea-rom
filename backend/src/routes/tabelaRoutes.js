const express = require('express');
const router = express.Router();

const {
  buscarCadastradosPorDias,            // Liberado
  buscarOrcamentosAprovadosPorDias,    // OL
  buscarAguardandoFinanceiroPorDias    // Bloqueado
} = require('../controllers/tabelaController');

router.get('/orcamentos-hoje', (req, res) => {
  const dias = parseInt(req.query.dias || 30) || 30;
  console.log(`Rota orcamentos-hoje => dias = ${dias}`);
  buscarCadastradosPorDias(dias, (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json(rows || []);
  });
});

router.get('/orcamentos-aguardando-financeiro', (req, res) => {
  const dias = parseInt(req.query.dias || 30) || 30;
  console.log(`Rota aguardando-financeiro => dias = ${dias}`);
  buscarAguardandoFinanceiroPorDias(dias, (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json(rows || []);
  });
});

router.get('/orcamentos-aprovados', (req, res) => {
  const dias = parseInt(req.query.dias || 30) || 30;
  console.log(`Rota orcamentos-aprovados => dias = ${dias}`);
  buscarOrcamentosAprovadosPorDias(dias, (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json(rows || []);
  });
});

module.exports = router;