// controllers/estoqueController.js
const { withDbActive } = require('../config/db') 
// ^ ajusta o caminho conforme sua estrutura, tipo: '../database/firebird'

function listarItensPorOrcamento(req, res) {
  const { codorc } = req.params

  if (!codorc) {
    return res.status(400).json({ error: 'CODORC não informado' })
  }

  const sql = `
    SELECT 
      o.CODEMP, 
      o.CODFILIAL, 
      o.CODORC, 
      o.CODPROD, 
      o.QTDITORC, 
      e.DESCPROD, 
      e.SLDPROD 
    FROM VDITORCAMENTO o
    INNER JOIN EQPRODUTO e 
      ON e.CODEMP   = o.CODEMP 
     AND e.CODFILIAL = o.CODFILIAL 
     AND e.CODPROD   = o.CODPROD
    WHERE o.CODORC = ?
  `

  withDbActive((errConn, db) => {
    if (errConn) {
      console.error('Erro ao conectar no Firebird:', errConn)
      return res.status(500).json({ error: 'Falha na conexão com o banco' })
    }

    db.query(sql, [codorc], (errQuery, rows) => {
      // SEMPRE tentar detach no final
      db.detach()

      if (errQuery) {
        console.error('Erro ao buscar itens do orçamento:', errQuery)
        return res.status(500).json({ error: 'Erro ao buscar itens do orçamento' })
      }

      // rows é um array com os resultados da query
      const itens = (rows || []).map(r => {
        const qtdSolicitada = Number(r.QTDITORC ?? 0)
        const saldoAtual = Number(r.SLDPROD ?? 0)
        const saldoDepois = saldoAtual - qtdSolicitada

        return {
          codEmp: r.CODEMP,
          codFilial: r.CODFILIAL,
          codOrc: r.CODORC,
          codProd: r.CODPROD,
          descProd: r.DESCPROD,
          qtdSolicitada,
          saldoAtual,
          saldoDepois,
          estoqueInsuficiente: saldoDepois < 0,
        }
      })

      return res.json(itens)
    })
  })
}

module.exports = {
  listarItensPorOrcamento,
}