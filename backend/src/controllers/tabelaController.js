// controllers/tabelaController.js
const { withDbActive } = require('../config/db');

// 🔒 NÃO ALTERE A QUERY: deixada exatamente como você mandou
const QUERY_ORCAMENTOS = `
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
        WHEN UPPER(CAST(c.CIDCLI AS VARCHAR(60))) = 'CURITIBA' THEN c.BAIRCLI
        WHEN UPPER(c.UFCLI) <> 'PR' THEN c.UFCLI
        ELSE CAST(c.CIDCLI AS VARCHAR(60))
      END AS LOCAL_EXIBICAO,
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
            WHERE r.CODCLI=o.CODCLI
              AND ir.STATUSITREC IN ('R1','RL','RR')
              AND ir.DTVENCITREC < CURRENT_DATE
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
      AND o.CODTIPOMOV IN (600, 660)
      AND o.STATUSORC IN ('OA','OC','CD')
      AND o.DTORC >= CURRENT_DATE -30
    ORDER BY o.DTORC DESC, o.HINS DESC
`;

function buscarOrcamentosUnificadoPorDias(_ignored, cb) {
  withDbActive((err, db) => {
    if (err) return cb(err);
    db.query(QUERY_ORCAMENTOS, [], (e, rows) => {
      try {
        if (e) return cb(e);
        return cb(null, rows || []);
      } finally {
        try { db.detach(); } catch (_) {}
      }
    });
  });
}

// Liberados, mov. 600 ou 660
function buscarCadastradosPorDias(_ignored, cb) {
  buscarOrcamentosUnificadoPorDias(null, (err, rows) => {
    if (err) return cb(err);
    const out = (rows || []).filter(r =>
      String(r.STATUS_CLIENTE).trim() === 'Liberado' &&
      (Number(r.CODTIPOMOV) === 600 || Number(r.CODTIPOMOV) === 660)
    );
    cb(null, out);
  });
}

// Bloqueados, mov. 600
function buscarAguardandoFinanceiroPorDias(_ignored, cb) {
  buscarOrcamentosUnificadoPorDias(null, (err, rows) => {
    if (err) return cb(err);
    const out = (rows || []).filter(r =>
      String(r.STATUS_CLIENTE).trim() === 'Bloqueado' &&
      Number(r.CODTIPOMOV) === 600
    );
    cb(null, out);
  });
}

module.exports = {
  buscarOrcamentosUnificadoPorDias,
  buscarCadastradosPorDias,
  buscarAguardandoFinanceiroPorDias,
};
