// src/helpers/entregaHelper.js
const db = require('../config/mysql') // ajusta o caminho se for outro nome

async function buscarEntregadorPorLocal(bairro, cidade) {
  // garante que sempre trabalhamos com string "limpa"
  const bairroTrim = (bairro || '').trim()
  const cidadeTrim = (cidade || '').trim()

  // 1) tenta bater pelo BAIRRO
  if (bairroTrim) {
    const [rowsBairro] = await db.query(
      'SELECT entregador FROM entregador_bairro WHERE bairro = ? LIMIT 1',
      [bairroTrim]
    )

    if (rowsBairro.length > 0) {
      return rowsBairro[0].entregador
    }
  }

  // 2) se não achou, tenta pela CIDADE
  if (cidadeTrim) {
    const [rowsCidade] = await db.query(
      'SELECT entregador FROM entregador_bairro WHERE cidade = ? LIMIT 1',
      [cidadeTrim]
    )

    if (rowsCidade.length > 0) {
      return rowsCidade[0].entregador
    }
  }

  // 3) se não achou nada, mensagem padrão
  return 'Cliente fora do mapeamento de entrega'
}

module.exports = {
  buscarEntregadorPorLocal,
}