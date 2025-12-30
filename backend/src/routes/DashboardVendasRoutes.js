const express = require("express");
const router = express.Router();

const DashboardVendasController = require("../controllers/DashboardVendasController");

// Clientes que mais compraram
router.get("/top-clientes", DashboardVendasController.topClientes);

// Total de vendas por vendedor
router.get("/vendas-por-vendedor", DashboardVendasController.vendasPorVendedor);

module.exports = router;
