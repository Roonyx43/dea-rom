const { pool } = require('../config/mysql');

async function findEntregador(localExibicao) {
  const localRaw = localExibicao || '';
  const local = localRaw.trim();
  if (!local) return 'Transportadora';

  const [rowsBairro] = await pool.query(
    `
      SELECT e.nome AS entregador
      FROM entregador_bairro eb
      JOIN entregadores e ON e.id = eb.entregador_id
      WHERE UPPER(TRIM(eb.bairro)) = UPPER(?)
      LIMIT 1
    `,
    [local]
  );
  if (rowsBairro.length) return rowsBairro[0].entregador;

  const [rowsCidade] = await pool.query(
    `
      SELECT e.nome AS entregador
      FROM entregador_bairro eb
      JOIN entregadores e ON e.id = eb.entregador_id
      WHERE UPPER(TRIM(eb.cidade)) = UPPER(?)
      LIMIT 1
    `,
    [local]
  );
  if (rowsCidade.length) return rowsCidade[0].entregador;

  return 'Transportadora';
}

module.exports = { findEntregador };
