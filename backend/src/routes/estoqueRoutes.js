// routes/estoqueRoutes.js
const express = require('express')
const router = express.Router()
const estoqueController = require('../controllers/estoqueController')

// GET /api/estoque/:codorc/itens
router.get('/:codorc/itens', estoqueController.listarItensPorOrcamento)

module.exports = router