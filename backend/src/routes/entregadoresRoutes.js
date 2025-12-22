// routes/entregadoresRoutes.js
const router = require('express').Router()
const c = require('../controllers/entregadoresController')

router.get('/', c.list)
router.post('/', c.create)
router.put('/:id', c.update)

// ✅ desativar separado
router.patch('/:id/disable', c.disable)

// ✅ excluir de verdade
router.delete('/:id', c.remove)

router.get('/:id/locais', c.listLocais)
router.post('/:id/locais', c.addLocal)
router.delete('/:id/locais/:localId', c.removeLocal)

module.exports = router
