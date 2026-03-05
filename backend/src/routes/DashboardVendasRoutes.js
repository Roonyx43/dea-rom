const express = require("express");
const router = express.Router();

const DashboardVendasController = require("../controllers/DashboardVendasController");

// ============================
// 📊 DASHBOARD VENDAS
// ============================

// Clientes que mais compraram
router.get("/top-clientes", DashboardVendasController.topClientes);

// Ranking de vendedores
router.get("/ranking-vendedores", DashboardVendasController.rankingVendedores);

// Total de vendas por vendedor
router.get("/vendas-por-vendedor", DashboardVendasController.vendasPorVendedor);

// Evolução de vendas por dia
router.get("/evolucao-vendas", DashboardVendasController.evolucaoVendas);

module.exports = router;