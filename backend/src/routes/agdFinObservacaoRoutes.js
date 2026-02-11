// backend/src/routes/agdFinObservacaoRoutes.js
const express = require('express')
const router = express.Router()
const AgdFinObservacaoController = require('../controllers/AgdFinObservacaoController')

// POST /api/agdfin/observacao
router.get('/observacao', (req, res) => AgdFinObservacaoController.listar(req, res))
router.post('/observacao', (req, res) => AgdFinObservacaoController.salvar(req, res))

module.exports = router