const router = require('express').Router();
const c = require('../controllers/entregadoresController');

router.get('/', c.list);
router.post('/', c.create);
router.put('/:id', c.update);
router.delete('/:id', c.disable);
router.delete('/:id/permanente', c.removePermanent);

router.get('/:id/locais', c.listLocais);
router.post('/:id/locais', c.addLocal);
router.delete('/:id/locais/:localId', c.removeLocal);

module.exports = router;
