const { withDbActive } = require("../config/db");

/* 1) OA/OC/CD - unificada com status financeiro (sem alterar DB) */
function buscarOrcamentosPorDias(dias, callback) {
  let diasNum = parseInt(dias, 10);
  if (!Number.isFinite(diasNum) || diasNum < 0) diasNum = 0;

  const filterClause = diasNum === 0
    ? "o.DTORC >= CURRENT_DATE AND o.DTORC < CURRENT_DATE + 1"
    : `o.DTORC >= CURRENT_DATE - ${diasNum}`;

  const query = `
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
      CASE WHEN c.CIDCLI='Curitiba' THEN c.BAIRCLI
          WHEN c.CIDCLI<>'Curitiba' AND c.UFCLI<>'PR' THEN c.UFCLI
          ELSE c.CIDCLI END AS LOCAL_EXIBICAO,
      c.BAIRCLI,
      c.IDENTIFICACAOCLI,
      c.ATIVOCLI,
      CASE
        WHEN (
          SELECT FIRST 1 l.OPERACAO
          FROM VDCLILIBERACAO l
          LEFT JOIN VDORCAMENTO oo ON oo.CODEMP=l.CODEMPOC AND oo.CODFILIAL=l.CODFILIALOC AND oo.CODORC=l.CODORC AND oo.TIPOORC=l.TIPOORC
          WHERE l.CODCLI=o.CODCLI
            AND oo.CODEMP=o.CODEMP AND oo.CODFILIAL=o.CODFILIAL AND oo.CODORC=o.CODORC AND oo.TIPOORC='O'
          ORDER BY l.DTALT DESC, l.HALT DESC
        ) = 'B' THEN 'Bloqueado'
        WHEN (
          SELECT FIRST 1 l.OPERACAO
          FROM VDCLILIBERACAO l
          LEFT JOIN VDORCAMENTO oo ON oo.CODEMP=l.CODEMPOC AND oo.CODFILIAL=l.CODFILIALOC AND oo.CODORC=l.CODORC AND oo.TIPOORC=l.TIPOORC
          WHERE l.CODCLI=o.CODCLI
            AND oo.CODEMP=o.CODEMP AND oo.CODFILIAL=o.CODFILIAL AND oo.CODORC=o.CODORC AND oo.TIPOORC='O'
          ORDER BY l.DTALT DESC, l.HALT DESC
        ) = 'L' THEN 'Liberado'
        WHEN (
          EXISTS (
            SELECT 1
            FROM FNITRECEBER ir
            JOIN FNRECEBER r ON r.CODEMP=ir.CODEMP AND r.CODFILIAL=ir.CODFILIAL AND r.CODREC=ir.CODREC
            JOIN VDCLIENTE vc ON vc.CODCLI=r.CODCLI AND vc.CODEMP=r.CODEMPCL AND vc.CODFILIAL=r.CODFILIALCL
            WHERE vc.CODCLI=o.CODCLI AND vc.CODEMP=o.CODEMP AND vc.CODFILIAL=o.CODFILIAL
              AND ir.CODEMP=o.CODEMP AND ir.CODFILIAL=o.CODFILIAL
              AND ir.STATUSITREC IN ('R1','RL','RR')
              AND (ir.DTVENCITREC + 5) < CURRENT_DATE
              AND EXTRACT(WEEKDAY FROM ir.DTVENCITREC) NOT IN (5,6)
          )
          AND NOT EXISTS (
            SELECT 1
            FROM VDCLILIBERACAO l
            LEFT JOIN VDORCAMENTO oo ON oo.CODEMP=l.CODEMPOC AND oo.CODFILIAL=l.CODFILIALOC AND oo.CODORC=l.CODORC AND oo.TIPOORC=l.TIPOORC
            WHERE l.FUNCAO='OC' AND l.OPERACAO='L'
              AND oo.CODEMP=o.CODEMP AND oo.CODFILIAL=o.CODFILIAL AND oo.CODORC=o.CODORC AND oo.TIPOORC='O'
          )
        )
        OR EXISTS (
          SELECT 1
          FROM FNRESTRICAO fr
          JOIN FNTIPORESTR tr ON tr.CODEMP=fr.CODEMPTR AND tr.CODFILIAL=fr.CODFILIALTR AND tr.CODTPRESTR=fr.CODTPRESTR
          WHERE fr.CODEMP=o.CODEMP AND fr.CODFILIAL=o.CODFILIAL AND fr.CODCLI=o.CODCLI
            AND (fr.DTCANCRESTR IS NULL OR fr.DTCANCRESTR > CURRENT_DATE)
            AND COALESCE(tr.BLOQTPRESTR,'N') IN ('S','1','T')
        )
        THEN 'Bloqueado'
        ELSE 'Liberado'
      END AS STATUS_CLIENTE,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM FNRESTRICAO fr
          JOIN FNTIPORESTR tr ON tr.CODEMP=fr.CODEMPTR AND tr.CODFILIAL=fr.CODFILIALTR AND tr.CODTPRESTR=fr.CODTPRESTR
          WHERE fr.CODEMP=o.CODEMP AND fr.CODFILIAL=o.CODFILIAL AND fr.CODCLI=o.CODCLI
            AND (fr.DTCANCRESTR IS NULL OR fr.DTCANCRESTR > CURRENT_DATE)
            AND COALESCE(tr.BLOQTPRESTR,'N') IN ('S','1','T')
        ) THEN 'Restricao ativa'
        WHEN EXISTS (
          SELECT 1
          FROM FNITRECEBER ir
          JOIN FNRECEBER r ON r.CODEMP=ir.CODEMP AND r.CODFILIAL=ir.CODFILIAL AND r.CODREC=ir.CODREC
          JOIN VDCLIENTE vc ON vc.CODCLI=r.CODCLI AND vc.CODEMP=r.CODEMPCL AND vc.CODFILIAL=r.CODFILIALCL
          WHERE vc.CODCLI=o.CODCLI AND vc.CODEMP=o.CODEMP AND vc.CODFILIAL=o.CODFILIAL
            AND ir.CODEMP=o.CODEMP AND ir.CODFILIAL=o.CODFILIAL
            AND ir.STATUSITREC IN ('R1','RL','RR')
            AND (ir.DTVENCITREC + 5) < CURRENT_DATE
            AND EXTRACT(WEEKDAY FROM ir.DTVENCITREC) NOT IN (5,6)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM VDCLILIBERACAO l
          LEFT JOIN VDORCAMENTO oo ON oo.CODEMP=l.CODEMPOC AND oo.CODFILIAL=l.CODFILIALOC AND oo.CODORC=l.CODORC AND oo.TIPOORC=l.TIPOORC
          WHERE l.FUNCAO='OC' AND l.OPERACAO='L'
            AND oo.CODEMP=o.CODEMP AND oo.CODFILIAL=o.CODFILIAL AND oo.CODORC=o.CODORC AND oo.TIPOORC='O'
        ) THEN 'Titulos vencidos sem liberacao'
        ELSE (
          SELECT FIRST 1 l.MOTIVO
          FROM VDCLILIBERACAO l
          LEFT JOIN VDORCAMENTO oo ON oo.CODEMP=l.CODEMPOC AND oo.CODFILIAL=l.CODFILIALOC AND oo.CODORC=l.CODORC AND oo.TIPOORC=l.TIPOORC
          WHERE l.CODCLI=o.CODCLI
            AND oo.CODEMP=o.CODEMP AND oo.CODFILIAL=o.CODFILIAL AND oo.CODORC=o.CODORC AND oo.TIPOORC='O'
          ORDER BY l.DTALT DESC, l.HALT DESC
        )
      END AS MOTIVO_BLOQUEIO,
      (
        SELECT FIRST 1 l.DTALT
        FROM VDCLILIBERACAO l
        LEFT JOIN VDORCAMENTO oo ON oo.CODEMP=l.CODEMPOC AND oo.CODFILIAL=l.CODFILIALOC AND oo.CODORC=l.CODORC AND oo.TIPOORC=l.TIPOORC
        WHERE l.CODCLI=o.CODCLI
          AND oo.CODEMP=o.CODEMP AND oo.CODFILIAL=o.CODFILIAL AND oo.CODORC=o.CODORC AND oo.TIPOORC='O'
        ORDER BY l.DTALT DESC, l.HALT DESC
      ) AS DTALT_BLOQUEIO
    FROM VDORCAMENTO o
    JOIN VDCLIENTE c ON c.CODEMP=o.CODEMP AND c.CODFILIAL=o.CODFILIAL AND c.CODCLI=o.CODCLI
    WHERE o.CODEMP=7
      AND o.CODFILIAL=1
      AND o.CODTIPOMOV in (600, 660)
      AND o.STATUSORC IN ('OA','OC','CD')
      AND ${filterClause}
    ORDER BY o.DTORC DESC, o.HINS DESC`;

  withDbActive((err, db) => {
    if (err) return callback(err, null);
    db.query(query, (err, result) => {
      db.detach();
      if (err) return callback(err, null);
      callback(null, result);
    });
  });
}

/* 2) OL - mantida */
function buscarOrcamentosAprovadosPorDias(dias, callback) {
  let diasNum = parseInt(dias, 10);
  if (!Number.isFinite(diasNum) || diasNum < 0) diasNum = 0;

  const filterClause = diasNum === 0
    ? "o.DTORC >= CURRENT_DATE AND o.DTORC < CURRENT_DATE + 1"
    : `o.DTORC >= CURRENT_DATE - ${diasNum}`;

  const query = `
SELECT FIRST 100
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
    WHEN m.NOMEMUNIC = 'Curitiba' THEN c.BAIRCLI
    WHEN m.NOMEMUNIC <> 'Curitiba' AND c.SIGLAUF <> 'PR' THEN c.SIGLAUF
    ELSE m.NOMEMUNIC
  END AS LOCAL_EXIBICAO,
  c.BAIRCLI,
  c.IDENTIFICACAOCLI,
  c.ATIVOCLI,
  o.SITANALISECRED
FROM VDORCAMENTO o
INNER JOIN VDCLIENTE c
  ON c.CODEMP = o.CODEMPCL
 AND c.CODFILIAL = o.CODFILIALCL
 AND c.CODCLI = o.CODCLI
INNER JOIN SGMUNICIPIO m
  ON m.CODPAIS = c.CODPAIS AND m.SIGLAUF = c.SIGLAUF AND m.CODMUNIC = c.CODMUNIC
WHERE ${filterClause}
  AND o.STATUSORC = 'OL'
  AND o.CODTIPOMOV in (600)
  AND o.CODEMP = 7
  AND o.CODFILIAL = 1
ORDER BY o.DTORC DESC, o.HINS DESC`;

  withDbActive((err, db) => {
    if (err) return callback(err, null);
    db.query(query, (err, result) => {
      db.detach();
      if (err) return callback(err, null);
      callback(null, result);
    });
  });
}

/* -- NOVOS WRAPPERS (substituem a antiga 3A/3B) -- */

/** Aguardando Financeiro: filtra Bloqueado da unificada */
function buscarAguardandoFinanceiroPorDias(dias, callback) {
  buscarOrcamentosPorDias(dias, (err, rows) => {
    if (err) return callback(err);
    const arr = Array.isArray(rows) ? rows : [];
    const out = arr.filter(r => String(r.STATUS_CLIENTE || '').trim().toUpperCase() === 'BLOQUEADO');
    callback(null, out);
  });
}

/** Cadastrados: filtra Liberado da unificada */
function buscarCadastradosPorDias(dias, callback) {
  buscarOrcamentosPorDias(dias, (err, rows) => {
    if (err) return callback(err);
    const arr = Array.isArray(rows) ? rows : [];
    const out = arr.filter(r => String(r.STATUS_CLIENTE || '').trim().toUpperCase() === 'LIBERADO');
    callback(null, out);
  });
}

module.exports = {
  buscarOrcamentosPorDias,
  buscarOrcamentosAprovadosPorDias,
  buscarAguardandoFinanceiroPorDias,
  buscarCadastradosPorDias,
  buscarOrcamentosAguardandoFinanceiroPorDias: buscarAguardandoFinanceiroPorDias,
};

