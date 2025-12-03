const { withDbActive } = require('../config/db');
const { pool } = require('../config/mysql');

// Busca entregador usando o "local" (LOCAL_EXIBICAO / bairro)
// Regra: tenta bater com bairro, se não achou tenta cidade, se não achar => "Transportadora"
async function findEntregador(localExibicao) {
  const localRaw = localExibicao || '';
  const local = localRaw.trim();

  if (!local) {
    return 'Transportadora';
  }

  // 1) tenta como BAIRRO (normalizando dos dois lados)
  const [rowsBairro] = await pool.query(
    `
      SELECT entregador
      FROM entregador_bairro
      WHERE UPPER(TRIM(bairro)) = UPPER(?)
      LIMIT 1
    `,
    [local]
  );
  if (rowsBairro.length) {
    return rowsBairro[0].entregador;
  }

  // 2) se não achou, tenta como CIDADE
  const [rowsCidade] = await pool.query(
    `
      SELECT entregador
      FROM entregador_bairro
      WHERE UPPER(TRIM(cidade)) = UPPER(?)
      LIMIT 1
    `,
    [local]
  );
  if (rowsCidade.length) {
    return rowsCidade[0].entregador;
  }

  // 3) fallback
  return 'Transportadora';
}

function fbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    withDbActive((err, db) => {
      if (err) return reject(err);
      db.query(sql, params, (e, rows) => {
        db.detach();
        if (e) return reject(e);
        resolve(rows || []);
      });
    });
  });
}

async function moverStatusTicket({ codorc, status, username, motivo }, cb) {
  try {
    const cod = parseInt(codorc, 10);
    if (!Number.isFinite(cod)) return cb(new Error('codorc inválido'));

    const rs = await fbQuery(
      `SELECT FIRST 1 CODCLI FROM VDORCAMENTO WHERE CODEMP=7 AND CODFILIAL=1 AND CODORC=?`,
      [cod]
    );
    const row = rs[0];
    if (!row) return cb(new Error('Orçamento não encontrado'));

    const upsert = `
      INSERT INTO tickets_dashboard (codorc, codcli, status, status_at, created_at, updated_at, username, motivo)
      VALUES (?, ?, ?, NOW(), NOW(), NOW(), ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        status_at = NOW(),
        updated_at = NOW(),
        username = VALUES(username),
        motivo = VALUES(motivo)
    `;
    await pool.query(upsert, [cod, row.CODCLI, status, username || null, motivo || null]);
    cb(null, { ok: true });
  } catch (err) {
    cb(err);
  }
}

function toYMD(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ===== APROVADOS =====
async function fetchAprovadosBaseFB(dias) {
  let n = parseInt(dias, 10);
  if (!Number.isFinite(n) || n < 0) n = 30;
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - n);
  const cutoffStr = toYMD(cutoff);

  const sql = `
    SELECT
      o.CODORC, o.CODCLI, o.DTORC, o.HINS,
      c.IDENTIFICACAOCLI, c.BAIRCLI, c.UFCLI,
      CASE
        WHEN UPPER(TRIM(c.CIDCLI)) = 'CURITIBA' THEN TRIM(c.BAIRCLI)
        WHEN UPPER(TRIM(c.UFCLI)) <> 'PR'      THEN TRIM(c.UFCLI)
        ELSE TRIM(c.CIDCLI)
      END AS LOCAL_EXIBICAO
    FROM VDORCAMENTO o
    JOIN VDCLIENTE c ON c.CODEMP=o.CODEMP AND c.CODFILIAL=o.CODFILIAL AND c.CODCLI=o.CODCLI
    WHERE o.CODEMP=7 AND o.CODFILIAL=1 AND o.STATUSORC='OL' AND o.CODTIPOMOV=600 AND o.DTORC>=?
    ORDER BY o.DTORC DESC, o.HINS DESC`;

  return fbQuery(sql, [cutoffStr]);
}

async function fetchItensPorOrcamentosFB(codorcs) {
  if (!Array.isArray(codorcs) || codorcs.length === 0) return new Map();

  const placeholders = codorcs.map(() => '?').join(',');

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
      ON e.CODEMP    = o.CODEMP 
     AND e.CODFILIAL = o.CODFILIAL 
     AND e.CODPROD   = o.CODPROD
    WHERE o.CODORC IN (${placeholders})
  `;

  const rows = await fbQuery(sql, codorcs);

  const map = new Map();

  for (const r of rows || []) {
    const qtdSolicitada = Number(r.QTDITORC ?? 0);
    const saldoAtual = Number(r.SLDPROD ?? 0);
    const saldoDepois = saldoAtual - qtdSolicitada;

    const item = {
      codEmp: r.CODEMP,
      codFilial: r.CODFILIAL,
      codCli: r.CODCLI,
      codOrc: r.CODORC,
      codProd: r.CODPROD,
      descProd: r.DESCPROD,
      qtdSolicitada,
      saldoAtual,
      saldoDepois,
      estoqueInsuficiente: saldoDepois < 0,
    };

    if (!map.has(r.CODORC)) {
      map.set(r.CODORC, []);
    }
    map.get(r.CODORC).push(item);
  }

  return map;
}

async function fetchTDByCodorcsMy(codorcs) {
  if (!Array.isArray(codorcs) || codorcs.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT codorc, codcli, status, status_at, username, motivo FROM tickets_dashboard WHERE codorc IN (?)`,
    [codorcs]
  );
  return rows || [];
}

function listarAprovados(dias, cb) {
  (async () => {
    const base = await fetchAprovadosBaseFB(dias);
    const codorcs = base.map(r => r.CODORC);

    const td = await fetchTDByCodorcsMy(codorcs);
    const mapTD = new Map(td.map(r => [r.codorc, r]));

    const mapItens = await fetchItensPorOrcamentosFB(codorcs);

    const rowsBase = base
      .filter(r => {
        const t = mapTD.get(r.CODORC);
        return !t || t.status === 'APROVADO';
      })
      .map(r => {
        const t = mapTD.get(r.CODORC);
        const baseDate = t?.status_at || r.DTORC;
        const diasStatus = Math.floor(
          (Date.now() - new Date(baseDate).getTime()) / 86400000
        );

        const itens = mapItens.get(r.CODORC) || [];
        const estoqueInsuficiente = itens.some(i => i.estoqueInsuficiente);

        return {
          ...r,
          DIAS_STATUS: diasStatus,
          ITENS: itens,
          ESTOQUE_INSUFICIENTE: estoqueInsuficiente,
        };
      });

    const rowsComEntregador = await Promise.all(
      rowsBase.map(async (r) => {
        const entregador = await findEntregador(
          r.LOCAL_EXIBICAO || r.BAIRCLI || null
        );

        return {
          ...r,
          ENTREGADOR: entregador,
        };
      })
    );

    cb(null, rowsComEntregador);
  })().catch(err => cb(err));
}

// ===== ORÇAMENTOS AUX =====
async function fetchOrcamentosByCodorcsFB(codorcs) {
  if (!Array.isArray(codorcs) || codorcs.length === 0) return [];
  const ints = codorcs.map(n => parseInt(n, 10)).filter(Number.isFinite);
  if (ints.length === 0) return [];
  const inList = ints.join(',');

  return fbQuery(`
    SELECT
      o.CODORC,
      o.CODCLI,
      o.DTORC,
      o.HINS,
      c.IDENTIFICACAOCLI,
      COALESCE(c.BAIRENT, c.BAIRCLI) AS BAIRCLI,
      COALESCE(c.UFENT,   c.UFCLI)   AS UFCLI,
      COALESCE(c.CIDENT,  c.CIDCLI)  AS CIDCLI,
      CASE
        WHEN COALESCE(c.CIDENT, c.CIDCLI) = 'Curitiba'
          THEN COALESCE(c.BAIRENT, c.BAIRCLI)
        WHEN COALESCE(c.CIDENT, c.CIDCLI) <> 'Curitiba'
         AND COALESCE(c.UFENT, c.UFCLI) <> 'PR'
          THEN COALESCE(c.UFENT, c.UFCLI)
        ELSE COALESCE(c.CIDENT, c.CIDCLI)
      END AS LOCAL_EXIBICAO
    FROM VDORCAMENTO o
    JOIN VDCLIENTE c ON c.CODEMP=o.CODEMP AND c.CODFILIAL=o.CODFILIAL AND c.CODCLI=o.CODCLI
    WHERE o.CODEMP=7 AND o.CODFILIAL=1 AND o.CODORC IN (${inList})
  `);
}

// ===== OAO / CCD / FINANCEIRO =====
async function fetchUnificadoOAOCCD(dias) {
  let n = parseInt(dias, 10);
  if (!Number.isFinite(n) || n < 0) n = 30;

  const sql = `
    SELECT
      o.CODEMP,
      o.CODFILIAL,
      o.CODCLI,
      o.STATUSORC,
      o.CODORC,
      o.DTORC,
      o.DTVENCORC,
      o.HINS,
      o.CODTIPOMOV,
      CASE
        WHEN COALESCE(c.CIDENT, c.CIDCLI) = 'Curitiba'
          THEN COALESCE(c.BAIRENT, c.BAIRCLI)
        WHEN COALESCE(c.CIDENT, c.CIDCLI) <> 'Curitiba'
         AND COALESCE(c.UFENT, c.UFCLI) <> 'PR'
          THEN COALESCE(c.UFENT, c.UFCLI)
        ELSE COALESCE(c.CIDENT, c.CIDCLI)
      END AS LOCAL_EXIBICAO,
      COALESCE(c.BAIRENT, c.BAIRCLI) AS BAIRCLI,
      c.IDENTIFICACAOCLI,
      c.ATIVOCLI,
      CASE
        WHEN (
          EXISTS (
            SELECT 1
            FROM fnitreceber ir
            JOIN fnreceber r ON r.codemp=ir.codemp AND r.codfilial=ir.codfilial AND r.codrec=ir.codrec
            JOIN vdcliente vc ON vc.codcli=r.codcli AND vc.codemp=r.codempcl AND vc.codfilial=r.codfilialcl
            WHERE vc.codcli=o.codcli AND vc.codemp=o.codemp And vc.codfilial=o.codfilial
              AND ir.codemp=o.codemp AND ir.codfilial=o.codfilial
              AND ir.statusitrec IN ('R1','RL','RR')
              AND (ir.dtvencitrec + 5) < CURRENT_DATE
              AND EXTRACT(WEEKDAY FROM ir.dtvencitrec) NOT IN (5,6)
          )
          AND NOT EXISTS (
            SELECT 1
            FROM vdcliliberacao l
            LEFT JOIN vdorcamento oo ON oo.codemp=l.codempoc And oo.codfilial=l.codfilialoc And oo.codorc=l.codorc And oo.tipoorc=l.tipoorc
            WHERE l.funcao='OC' AND l.operacao='L'
              AND oo.codemp=o.codemp And oo.codfilial=o.codfilial And oo.codorc=o.codorc And oo.tipoorc='O'
          )
        )
        OR EXISTS (
          SELECT 1
          FROM fnrestricao fr
          JOIN fntiporestr tr ON tr.codemp=fr.codemptr And tr.codfilial=fr.codfilialtr And tr.codtprestr=fr.codtprestr
          WHERE fr.codemp=o.codemp And fr.codfilial=o.codfilial And fr.codcli=o.codcli
            AND (fr.dtcancrestr IS NULL OR fr.dtcancrestr > CURRENT_DATE)
            AND COALESCE(tr.bloqtprestr,'N') IN ('S','1','T')
        )
        THEN 'Bloqueado'
        ELSE 'Liberado'
      END AS STATUS_CLIENTE,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM fnrestricao fr
          JOIN fntiporestr tr ON tr.codemp=fr.codemptr And tr.codfilial=fr.codfilialtr And tr.codtprestr=fr.codtprestr
          WHERE fr.codemp=o.codemp And fr.codfilial=o.codfilial And fr.codcli=o.codcli
            AND (fr.dtcancrestr IS NULL OR fr.dtcancrestr > CURRENT_DATE)
            AND COALESCE(tr.bloqtprestr,'N') IN ('S','1','T')
        ) THEN 'Restrição ativa'
        WHEN EXISTS (
          SELECT 1
          FROM fnitreceber ir
          JOIN fnreceber r ON r.codemp=ir.codemp And r.codfilial=ir.codfilial And r.codrec=ir.codrec
          JOIN vdcliente vc ON vc.codcli=r.codcli And vc.codemp=r.codempcl And vc.codfilial=r.codfilialcl
          WHERE vc.codcli=o.codcli And vc.codemp=o.codemp And vc.codfilial=o.codfilial
            AND ir.codemp=o.codemp And ir.codfilial=o.codfilial
            AND ir.statusitrec IN ('R1','RL','RR')
            AND (ir.dtvencitrec + 5) < CURRENT_DATE
            AND EXTRACT(WEEKDAY FROM ir.dtvencitrec) NOT IN (5,6)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM vdcliliberacao l
          LEFT JOIN vdorcamento oo ON oo.codemp=l.codempoc And oo.codfilial=l.codfilialoc And oo.codorc=l.codorc And oo.tipoorc=l.tipoorc
          WHERE l.funcao='OC' And l.operacao='L'
            AND oo.codemp=o.codemp And oo.codfilial=o.codfilial And oo.codorc=o.codorc And oo.tipoorc='O'
        ) THEN 'Títulos vencidos sem liberação'
        ELSE (
          SELECT FIRST 1 l.MOTIVO
          FROM VDCLILIBERACAO l
          LEFT JOIN VDORCAMENTO oo ON oo.codemp=l.codempoc And oo.codfilial=l.codfilialoc And oo.codorc=l.codorc And oo.tipoorc=l.tipoorc
          WHERE l.CODCLI=o.CODCLI
            AND oo.codemp=o.codemp And oo.codfilial=o.codfilial And oo.codorc=o.codorc And oo.tipoorc='O'
          ORDER BY l.DTALT DESC, l.HALT DESC
        )
      END AS MOTIVO_EXIBICAO,
      (
        SELECT FIRST 1 l.DTALT
        FROM VDCLILIBERACAO l
        LEFT JOIN VDORCAMENTO oo ON oo.codemp=l.codempoc And oo.codfilial=l.codfilialoc And oo.codorc=l.codorc And oo.tipoorc=l.tipoorc
        WHERE l.CODCLI=o.CODCLI
          AND oo.codemp=o.codemp And oo.codfilial=o.codfilial And oo.codorc=o.codorc And oo.tipoorc='O'
        ORDER BY l.DTALT DESC, l.HALT DESC
      ) AS DTALT_ULT_LIB
    FROM VDORCAMENTO o
    JOIN VDCLIENTE c ON c.CODEMP=o.CODEMP And c.CODFILIAL=o.CODFILIAL And c.CODCLI=o.CODCLI
    WHERE o.CODEMP=7 And o.CODFILIAL=1 And o.CODTIPOMOV=600 And o.STATUSORC IN ('OA','OC','CD') And o.DTORC >= CURRENT_DATE - ?
    ORDER BY o.DTORC DESC, o.HINS DESC
  `;

  return fbQuery(sql, [n]);
}

// ===== RECUSADOS (VN) =====
async function fetchRecusadosBaseFB(dias) {
  let n = parseInt(dias, 10);
  if (!Number.isFinite(n) || n < 0) n = 30;

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - n);
  const cutoffStr = toYMD(cutoff);

  const sql = `
    SELECT
      o.CODEMP,
      o.CODFILIAL,
      o.CODCLI,
      o.CODORC,
      o.DTORC,
      o.HINS,
      v.SITCOMPLVENDA,
      v.STATUSVENDA,
      c.IDENTIFICACAOCLI,
      COALESCE(c.BAIRENT, c.BAIRCLI) AS BAIRCLI,
      COALESCE(c.UFENT,   c.UFCLI)   AS UFCLI,
      CASE
        WHEN COALESCE(c.CIDENT, c.CIDCLI) = 'Curitiba'
          THEN COALESCE(c.BAIRENT, c.BAIRCLI)
        WHEN COALESCE(c.CIDENT, c.CIDCLI) <> 'Curitiba'
         AND COALESCE(c.UFENT, c.UFCLI) <> 'PR'
          THEN COALESCE(c.UFENT, c.UFCLI)
        ELSE COALESCE(c.CIDENT, c.CIDCLI)
      END AS LOCAL_EXIBICAO
    FROM VDORCAMENTO o
    INNER JOIN VDVENDAORC vo
      ON  vo.CODEMPOR    = o.CODEMP
      AND vo.CODFILIALOR = o.CODFILIAL
      AND vo.CODORC      = o.CODORC
      AND vo.TIPOORC     = o.TIPOORC
    INNER JOIN VDVENDA v
      ON  v.CODEMP    = vo.CODEMP
      AND v.CODFILIAL = vo.CODFILIAL
      AND v.CODVENDA  = vo.CODVENDA
      AND v.TIPOVENDA = vo.TIPOVENDA
    INNER JOIN VDCLIENTE c
      ON  c.CODEMP    = o.CODEMPCL
      AND c.CODFILIAL = o.CODFILIALCL
      AND c.CODCLI    = o.CODCLI
    WHERE
      o.CODEMP    = 7
      AND o.CODFILIAL = 1
      AND o.STATUSORC = 'OV'
      AND v.STATUSVENDA = 'NV'
      AND o.DTORC >= CURRENT_DATE - 60
  `;

  return fbQuery(sql, [cutoffStr]);
}

/**
 * Busca, no Firebird, quais CODORC têm pelo menos um item com
 * saldoDepois (SLDPROD - QTDITORC) < 0.
 */
async function fetchCodorcsComEstoqueInsuficienteFB(codorcs) {
  if (!Array.isArray(codorcs) || codorcs.length === 0) return [];
  const ints = codorcs.map(n => parseInt(n, 10)).filter(Number.isFinite);
  if (!ints.length) return [];
  const inList = ints.join(',');

  const sql = `
    SELECT DISTINCT o.CODORC
    FROM VDITORCAMENTO o
    JOIN EQPRODUTO e
      ON e.CODEMP   = o.CODEMP
     AND e.CODFILIAL = o.CODFILIAL
     AND e.CODPROD   = o.CODPROD
    WHERE o.CODEMP=7
      AND o.CODFILIAL=1
      AND o.CODORC IN (${inList})
      AND (e.SLDPROD - o.QTDITORC) < 0
  `;

  return fbQuery(sql);
}

// ===== AGUARDANDO PCP =====
async function listarAguardandoPCP(cb) {
  try {
    const [rows] = await pool.query(
      `SELECT codorc, codcli, status, username, motivo, status_at FROM tickets_dashboard WHERE status='AGUARDANDO_PCP' ORDER BY status_at DESC`
    );
    if (!rows.length) return cb(null, []);

    const codorcs = rows.map(r => r.codorc);

    const criticos = await fetchCodorcsComEstoqueInsuficienteFB(codorcs);
    const criticosSet = new Set(criticos.map(c => c.CODORC));

    const filtrados = rows.filter(r => criticosSet.has(r.codorc));
    if (!filtrados.length) return cb(null, []);

    const detalhes = await fetchOrcamentosByCodorcsFB(filtrados.map(r => r.codorc));
    const map = new Map(detalhes.map(d => [d.CODORC, d]));

    const outBase = filtrados.map(t => {
      const d = map.get(t.codorc) || {};
      const dias = Math.floor((Date.now() - new Date(t.status_at).getTime()) / 86400000);
      return {
        CODORC: d.CODORC || t.codorc,
        CODCLI: d.CODCLI || t.codcli,
        DTORC: d.DTORC || null,
        HINS: d.HINS || null,
        IDENTIFICACAOCLI: d.IDENTIFICACAOCLI || null,
        BAIRCLI: d.BAIRCLI || null,
        UFCLI: d.UFCLI || null,
        CIDCLI: d.CIDCLI || null,
        LOCAL_EXIBICAO: d.LOCAL_EXIBICAO || null,
        STATUS_AT: t.status_at,
        USERNAME: t.username || null,
        MOTIVO: t.motivo || null,
        DIAS_STATUS: dias,
      };
    });

    const outComEntregador = await Promise.all(
      outBase.map(async (r) => {
        const entregador = await findEntregador(
          r.LOCAL_EXIBICAO || r.BAIRCLI || null
        );
        return { ...r, ENTREGADOR: entregador };
      })
    );

    cb(null, outComEntregador);
  } catch (err) {
    cb(err);
  }
}

// ===== RECUSADOS (lista final) =====
async function listarRecusados(dias, cb) {
  if (typeof dias === 'function') {
    cb = dias;
    dias = 30;
  }

  let n = parseInt(dias, 10);
  if (!Number.isFinite(n) || n < 0) n = 30;

  (async () => {
    const base = await fetchRecusadosBaseFB(n);
    if (!base.length) return cb(null, []);

    const codorcs = base.map(r => r.CODORC);
    const td = await fetchTDByCodorcsMy(codorcs);
    const mapTD = new Map(td.map(r => [r.codorc, r]));

    const outBase = base.map(r => {
      const t = mapTD.get(r.CODORC);
      const baseDate = t?.status_at || r.DTORC;
      const diasStatus = Math.floor(
        (Date.now() - new Date(baseDate).getTime()) / 86400000
      );

      return {
        CODORC: r.CODORC,
        CODCLI: r.CODCLI,
        DTORC: r.DTORC,
        HINS: r.HINS,
        IDENTIFICACAOCLI: r.IDENTIFICACAOCLI,
        BAIRCLI: r.BAIRCLI,
        UFCLI: r.UFCLI,
        LOCAL_EXIBICAO: r.LOCAL_EXIBICAO,
        STATUSVENDA: r.STATUSVENDA,
        SITCOMPLVENDA: r.SITCOMPLVENDA,
        STATUS_AT: t?.status_at || null,
        USERNAME: t?.username || null,
        MOTIVO: t?.motivo || null,
        DIAS_STATUS: diasStatus,
      };
    });

    const outComEntregador = await Promise.all(
      outBase.map(async (r) => {
        const entregador = await findEntregador(
          r.LOCAL_EXIBICAO || r.BAIRCLI || null
        );
        return { ...r, ENTREGADOR: entregador };
      })
    );

    cb(null, outComEntregador);
  })().catch(err => cb(err));
}

// ===== OUTROS =====
async function removerDoDashboard(codorc, cb) {
  try {
    const cod = parseInt(codorc, 10);
    if (!Number.isFinite(cod)) return cb(new Error('codorc inválido'));
    const [r] = await pool.query('DELETE FROM tickets_dashboard WHERE codorc=?', [cod]);
    cb(null, { ok: true, deleted: r.affectedRows });
  } catch (err) {
    cb(err);
  }
}

async function listarAguardandoFinanceiro(dias, cb) {
  try {
    const rows = await fetchUnificadoOAOCCD(dias);

    const outBase = (rows || [])
      .filter(r => String(r.STATUS_CLIENTE || '').toUpperCase() === 'BLOQUEADO')
      .map(r => {
        const baseDate = r.DTORC || new Date();
        const diasStatus = Math.floor(
          (Date.now() - new Date(baseDate).getTime()) / 86400000
        );
        return { ...r, DIAS_STATUS: diasStatus };
      });

    const outComEntregador = await Promise.all(
      outBase.map(async (r) => {
        const entregador = await findEntregador(
          r.LOCAL_EXIBICAO || r.BAIRCLI || null
        );
        return { ...r, ENTREGADOR: entregador };
      })
    );

    cb(null, outComEntregador);
  } catch (e) {
    cb(e);
  }
}

module.exports = {
  moverStatusTicket,
  listarAprovados,
  listarAguardandoPCP,
  listarRecusados,
  removerDoDashboard,
  listarAguardandoFinanceiro,
};