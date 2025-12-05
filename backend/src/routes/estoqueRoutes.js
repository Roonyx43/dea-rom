const express = require('express')
const router = express.Router()
const estoqueController = require('../controllers/estoqueController')
const db = require('../config/mysql')

// GET /api/estoque/:codorc/itens
router.get('/:codorc/itens', estoqueController.listarItensPorOrcamento)

// GET /api/estoque/:codorc/solicitados
router.get('/:codorc/solicitados', async (req, res) => {
  try {
    const codOrcamento = req.params.codorc

    const [rows] = await db.pool.query(
      `
      SELECT
        cod_orcamento,
        cod_produto,
        quantidade_solicitada
      FROM itens_solicitados_pcp
      WHERE cod_orcamento = ?
      `,
      [codOrcamento]
    )

    return res.json(rows)
  } catch (err) {
    console.error('[ERRO ao buscar itens solicitados]', err)
    return res.status(500).json({ error: 'Erro ao buscar itens solicitados.' })
  }
})

router.post('/:codigo/status', async (req, res) => {
  try {
    const codOrcamento = req.params.codigo
    const { status, username, motivo, itensSolicitados, codCli } = req.body

    // 1) UPSERT na tickets_dashboard
    //    Se não existir codorc -> INSERT
    //    Se já existir        -> UPDATE (status, username, motivo, status_at)
    await db.pool.query(
      `
      INSERT INTO tickets_dashboard (codorc, codcli, status, status_at, username, motivo)
      VALUES (?, ?, ?, NOW(), ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        status_at = NOW(),
        username = VALUES(username),
        motivo = VALUES(motivo)
      `,
      [codOrcamento, codCli, status, username, motivo]
    )

    // 2) Inserir itens solicitados no banco
    if (Array.isArray(itensSolicitados)) {
      for (const item of itensSolicitados) {
        await db.pool.query(
          `
          INSERT INTO itens_solicitados_pcp
            (cod_orcamento, cod_produto, quantidade_solicitada)
          VALUES (?, ?, ?)
          `,
          [codOrcamento, item.codProd, item.quantidadeSolicitada]
        )
      }
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('[ERRO ao salvar itens solicitados]', err)
    return res.status(500).json({ error: 'Erro ao salvar itens solicitados.' })
  }
})

module.exports = router