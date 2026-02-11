const { pool } = require('../config/mysql') // 👈 agora correto

class AgdFinObservacaoController {
  async salvar(req, res) {
    try {
      const { codorc, codcli, observacao, previsao } = req.body || {}

      if (!codorc) {
        return res.status(400).json({ error: 'codorc é obrigatório' })
      }

      const previsaoData = previsao ? String(previsao) : null
      const obs = observacao ? String(observacao) : null
      const cli = codcli ? String(codcli) : null

      const sql = `
        INSERT INTO dashboard_observacao_agdfin
          (codorc, codcli, observacao, previsao_data)
        VALUES
          (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          codcli = VALUES(codcli),
          observacao = VALUES(observacao),
          previsao_data = VALUES(previsao_data),
          updated_at = NOW()
      `

      // 👇 mysql2/promise retorna [result]
      const [result] = await pool.query(sql, [
        String(codorc),
        cli,
        obs,
        previsaoData,
      ])

      return res.json({
        ok: true,
        codorc: String(codorc),
        message: 'Observação salva com sucesso',
        affectedRows: result.affectedRows,
      })

    } catch (err) {
      console.error('AgdFinObservacaoController.salvar error:', err)
      return res.status(500).json({ error: 'Erro ao salvar observação' })
    }
  }

  async listar(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT codorc, observacao, previsao_data
      FROM dashboard_observacao_agdfin
    `)

    return res.json(rows)
  } catch (err) {
    console.error('AgdFinObservacaoController.listar error:', err)
    return res.status(500).json({ error: 'Erro ao listar observações' })
  }
}
}

module.exports = new AgdFinObservacaoController()