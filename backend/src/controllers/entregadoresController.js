const { pool } = require('../config/mysql');

// GET /api/entregadores
async function list(req, res) {
  const [rows] = await pool.query(
    `SELECT id, nome, ativo
     FROM entregadores
     ORDER BY nome`
  );
  res.json(rows || []);
}

// POST /api/entregadores
async function create(req, res) {
  const nome = String(req.body?.nome || '').trim();
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const [r] = await pool.query(
    `INSERT INTO entregadores (nome, ativo) VALUES (?, 1)`,
    [nome]
  );

  res.json({ ok: true, id: r.insertId });
}

// PUT /api/entregadores/:id
async function update(req, res) {
  const id = Number(req.params.id);
  const nome = String(req.body?.nome || '').trim();
  const ativo = req.body?.ativo;

  if (!id) return res.status(400).json({ error: 'ID inválido' });
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  await pool.query(
    `UPDATE entregadores SET nome=?, ativo=? WHERE id=?`,
    [nome, ativo ? 1 : 0, id]
  );

  res.json({ ok: true });
}

// DELETE /api/entregadores/:id  (remove lógico: desativa)
async function disable(req, res) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  await pool.query(`UPDATE entregadores SET ativo=0 WHERE id=?`, [id])
  res.json({ ok: true })
}

// GET /api/entregadores/:id/locais
async function listLocais(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const [rows] = await pool.query(
    `SELECT id, uf, cidade, bairro
     FROM entregador_bairro
     WHERE entregador_id=?
     ORDER BY uf, cidade, bairro`,
    [id]
  );

  res.json(rows || []);
}

// POST /api/entregadores/:id/locais
// POST /api/entregadores/:id/locais
async function addLocal(req, res) {
  const entregadorId = Number(req.params.id);
  if (!entregadorId) return res.status(400).json({ error: 'ID inválido' });

  const uf = String(req.body?.uf || '').trim().toUpperCase() || null;
  const cidade = String(req.body?.cidade || '').trim();
  const bairroRaw = String(req.body?.bairro || '').trim();
  const bairro = bairroRaw ? bairroRaw : null;

  if (!cidade) return res.status(400).json({ error: 'Cidade é obrigatória' });
  if (uf && uf.length !== 2) return res.status(400).json({ error: 'UF inválida' });

  // 1) evita duplicado para o MESMO entregador (igual você já fazia)
  const [existsSame] = await pool.query(
    `SELECT id
     FROM entregador_bairro
     WHERE entregador_id=?
       AND COALESCE(uf,'')=COALESCE(?, '')
       AND UPPER(TRIM(cidade))=UPPER(TRIM(?))
       AND COALESCE(UPPER(TRIM(bairro)),'')=COALESCE(UPPER(TRIM(?)), '')
     LIMIT 1`,
    [entregadorId, uf, cidade, bairro]
  );

  if (existsSame.length) {
    return res.status(409).json({ error: 'Local já existe para esse entregador' });
  }

  // 2) ✅ NOVO: bloqueia bairro repetido entre entregadores diferentes
  // Só aplica se bairro foi preenchido
  if (bairro) {
    const [conflict] = await pool.query(
      `SELECT eb.id, e.id AS entregador_id, e.nome AS entregador_nome
       FROM entregador_bairro eb
       JOIN entregadores e ON e.id = eb.entregador_id
       WHERE eb.entregador_id <> ?
         AND COALESCE(eb.uf,'') = COALESCE(?, '')
         AND UPPER(TRIM(eb.cidade)) = UPPER(TRIM(?))
         AND UPPER(TRIM(eb.bairro)) = UPPER(TRIM(?))
       LIMIT 1`,
      [entregadorId, uf, cidade, bairro]
    );

    if (conflict.length) {
      return res.status(409).json({
        error: 'Bairro já está associado a outro entregador',
        entregador: conflict[0].entregador_nome,
        entregadorId: conflict[0].entregador_id,
      });
    }
  }

  // 3) insere
  const [r] = await pool.query(
    `INSERT INTO entregador_bairro (entregador_id, uf, cidade, bairro)
     VALUES (?, ?, ?, ?)`,
    [entregadorId, uf, cidade, bairro]
  );

  res.json({ ok: true, id: r.insertId });
}

async function remove(req, res) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  try {
    // 1) apaga locais primeiro (pra não bater no FK)
    await pool.query(`DELETE FROM entregador_bairro WHERE entregador_id=?`, [id])

    // 2) apaga entregador
    await pool.query(`DELETE FROM entregadores WHERE id=?`, [id])

    res.json({ ok: true })
  } catch (e) {
    // Se ainda tiver FK travando por algum motivo
    return res.status(409).json({
      error: 'Não foi possível excluir: existem vínculos com esse entregador.',
    })
  }
}

// DELETE /api/entregadores/:id/locais/:localId
async function removeLocal(req, res) {
  const entregadorId = Number(req.params.id);
  const localId = Number(req.params.localId);

  if (!entregadorId || !localId) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  await pool.query(
    `DELETE FROM entregador_bairro WHERE id=? AND entregador_id=?`,
    [localId, entregadorId]
  );

  res.json({ ok: true });
}

module.exports = {
  list,
  create,
  update,
  disable,
  remove,
  listLocais,
  addLocal,
  removeLocal,
};