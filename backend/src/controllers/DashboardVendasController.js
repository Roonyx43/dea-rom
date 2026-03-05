const { withDbActive } = require("../config/db");

// ============================
// 🔥 CONFIG
// ============================
const CACHE_TTL_MS = 10_000; // 10s (bom pra socket)
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50; // evita pedirem TOP 999999 e matar o banco

// ============================
// ✅ FIREBIRD QUERY (Promise)
// ============================
function firebirdQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    withDbActive((err, db) => {
      if (err) return reject(err);

      db.query(sql, params, (queryErr, result) => {
        // ✅ Sempre soltar a conexão!
        try {
          db.detach();
        } catch (detachErr) {
          console.warn("[firebird] detach error:", detachErr.message);
        }

        if (queryErr) return reject(queryErr);
        resolve(result);
      });
    });
  });
}

// ============================
// ✅ PARAMS (datas + limit)
// ============================
function normalizeParams(req) {
  const { startDate, endDate, limit } = req.query;

  // ✅ default: últimos 30 dias
  const now = new Date();

  const end = endDate || now.toISOString().slice(0, 10);

  const start = startDate
    ? startDate
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

  // ✅ limit seguro
  let safeLimit = Number(limit);
  if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_LIMIT;
  if (safeLimit > MAX_LIMIT) safeLimit = MAX_LIMIT;

  return {
    startDate: start,
    endDate: end,
    limit: safeLimit,
  };
}

// ============================
// ✅ CACHE (bem simples)
// ============================
const cache = new Map();

function makeCacheKey(routeName, { startDate, endDate, limit }) {
  return `${routeName}|${startDate}|${endDate}|${limit}`;
}

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCache(key, data) {
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  });
}

// ============================
// ✅ CONTROLLER
// ============================
class DashboardVendasController {
  // ✅ Ranking de Vendedores
  async rankingVendedores(req, res) {
    try {
      const params = normalizeParams(req);
      const key = makeCacheKey("rankingVendedores", params);

      const cached = getCache(key);
      if (cached) return res.json(cached);

      const { startDate, endDate, limit } = params;

      const sql = `
        SELECT FIRST ${limit}
          vend.CODVEND,
          vend.NOMEVEND,
          SUM(COALESCE(v.VLRLIQVENDA, 0)) AS TOTAL_VENDIDO,
          COUNT(*) AS QTD_VENDAS
        FROM VDVENDA v
        JOIN VDVENDEDOR vend
          ON vend.CODVEND = v.CODVEND
         AND vend.CODFILIAL = v.CODFILIALVD
         AND vend.CODEMP = v.CODEMPVD
        WHERE v.DTEMITVENDA BETWEEN ? AND ?
          AND v.STATUSVENDA = 'V3'
          AND v.CODTIPOMOV = 801
        GROUP BY vend.CODVEND, vend.NOMEVEND
        ORDER BY TOTAL_VENDIDO DESC
      `;

      const result = await firebirdQuery(sql, [startDate, endDate]);

      const payload = { startDate, endDate, limit, data: result };
      setCache(key, payload);

      return res.json(payload);
    } catch (error) {
      console.error("rankingVendedores error:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar ranking de vendedores" });
    }
  }

  // ✅ Cliente que mais comprou
  async topClientes(req, res) {
    try {
      const params = normalizeParams(req);
      const key = makeCacheKey("topClientes", params);

      const cached = getCache(key);
      if (cached) return res.json(cached);

      const { startDate, endDate, limit } = params;

      const sql = `
        SELECT FIRST ${limit}
          c.CODCLI,
          c.RAZCLI,
          c.NOMECLI,
          SUM(COALESCE(v.VLRLIQVENDA, 0)) AS TOTAL_COMPRADO,
          COUNT(*) AS QTD_COMPRAS
        FROM VDVENDA v
        JOIN VDCLIENTE c
          ON c.CODCLI = v.CODCLI
         AND c.CODFILIAL = v.CODFILIALCL
         AND c.CODEMP = v.CODEMPCL
        WHERE v.DTEMITVENDA BETWEEN ? AND ?
          AND v.STATUSVENDA = 'V3'
          AND v.CODTIPOMOV = 801
        GROUP BY c.CODCLI, c.RAZCLI, c.NOMECLI
        ORDER BY TOTAL_COMPRADO DESC
      `;

      const result = await firebirdQuery(sql, [startDate, endDate]);

      const payload = { startDate, endDate, limit, data: result };
      setCache(key, payload);

      return res.json(payload);
    } catch (error) {
      console.error("topClientes error:", error);
      return res.status(500).json({ error: "Erro ao buscar top clientes" });
    }
  }

  // ✅ Valor de vendas por vendedor
  // ⚠️ Dica: essa rota é mais pesada. Se possível use só quando precisar.
  async vendasPorVendedor(req, res) {
    try {
      const params = normalizeParams(req);

      // ✅ cache separado também
      const key = makeCacheKey("vendasPorVendedor", params);
      const cached = getCache(key);
      if (cached) return res.json(cached);

      const { startDate, endDate, limit } = params;

      const sql = `
        SELECT FIRST ${limit}
          vend.CODVEND,
          vend.NOMEVEND,
          SUM(COALESCE(v.VLRLIQVENDA, 0)) AS TOTAL_VENDIDO,
          SUM(COALESCE(v.VLRPRODVENDA, 0)) AS TOTAL_PRODUTOS,
          COUNT(*) AS QTD_VENDAS
        FROM VDVENDA v
        JOIN VDVENDEDOR vend
          ON vend.CODVEND = v.CODVEND
         AND vend.CODFILIAL = v.CODFILIALVD
         AND vend.CODEMP = v.CODEMPVD
        WHERE v.DTEMITVENDA BETWEEN ? AND ?
          AND v.STATUSVENDA = 'V3'
          AND v.CODTIPOMOV = 801
        GROUP BY vend.CODVEND, vend.NOMEVEND
        ORDER BY TOTAL_VENDIDO DESC
      `;

      const result = await firebirdQuery(sql, [startDate, endDate]);

      const payload = { startDate, endDate, limit, data: result };
      setCache(key, payload);

      return res.json(payload);
    } catch (error) {
      console.error("vendasPorVendedor error:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar vendas por vendedor" });
    }
  }

  // ✅ Evolução de vendas por dia
  // ✅ Evolução de vendas por mês (ano inteiro)
  async evolucaoVendas(req, res) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();

      const key = `evolucaoVendas|${year}`;
      const cached = getCache(key);
      if (cached) return res.json(cached);

      const sql = `
      SELECT
        EXTRACT(MONTH FROM v.DTEMITVENDA) AS MES_NUM,
        SUM(COALESCE(v.VLRLIQVENDA, 0)) AS TOTAL
      FROM VDVENDA v
      WHERE EXTRACT(YEAR FROM v.DTEMITVENDA) = ?
        AND v.STATUSVENDA = 'V3'
        AND v.CODTIPOMOV = 801
      GROUP BY 1
      ORDER BY 1
    `;

      const result = await firebirdQuery(sql, [year]);

      // nomes dos meses
      const meses = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];

      // cria estrutura com 12 meses
      const mapa = Array.from({ length: 12 }, (_, i) => ({
        MES: meses[i],
        TOTAL: 0,
      }));

      // preenche com os dados retornados
      for (const row of result) {
        const idx = row.MES_NUM - 1;
        if (idx >= 0 && idx < 12) {
          mapa[idx].TOTAL = Number(row.TOTAL) || 0;
        }
      }

      const payload = {
        year,
        data: mapa,
      };

      setCache(key, payload);

      return res.json(payload);
    } catch (error) {
      console.error("evolucaoVendas error:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar evolução de vendas" });
    }
  }
}

module.exports = new DashboardVendasController();
