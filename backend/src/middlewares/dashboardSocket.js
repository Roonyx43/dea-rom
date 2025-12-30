const DashboardVendasController = require("../controllers/DashboardVendasController");

function callController(controllerFn, query = {}) {
  return new Promise((resolve, reject) => {
    const req = { query };

    const res = {
      json: (data) => resolve(data),
      status: (code) => ({
        json: (data) => reject({ code, data }),
      }),
    };

    controllerFn(req, res).catch(reject);
  });
}

module.exports = function dashboardSocket(io) {
  io.on("connection", async (socket) => {
    console.log("✅ Dashboard conectado:", socket.id);

    // ✅ carrega tudo uma vez quando conecta (padrão)
    try {
      const queryDefault = { limit: 10 };
      const [rankingVendedores, topClientes] = await Promise.all([
        callController(
          DashboardVendasController.rankingVendedores.bind(DashboardVendasController),
          queryDefault
        ),
        callController(
          DashboardVendasController.topClientes.bind(DashboardVendasController),
          queryDefault
        ),
      ]);

      socket.emit("dashboard:update", { rankingVendedores, topClientes });
    } catch (err) {
      console.error("❌ erro no dashboard inicial:", err);
      socket.emit("dashboard:error", { message: "Erro ao carregar dashboard" });
    }

    // ✅ refresh individual: vendedores
    socket.on("dashboard:refreshVendedores", async (query = {}) => {
      try {
        const rankingVendedores = await callController(
          DashboardVendasController.rankingVendedores.bind(DashboardVendasController),
          query
        );

        socket.emit("dashboard:vendedores:update", rankingVendedores);
      } catch (err) {
        console.error("❌ erro refresh vendedores:", err);
        socket.emit("dashboard:error", { message: "Erro ao atualizar vendedores" });
      }
    });

    // ✅ refresh individual: clientes
    socket.on("dashboard:refreshClientes", async (query = {}) => {
      try {
        const topClientes = await callController(
          DashboardVendasController.topClientes.bind(DashboardVendasController),
          query
        );

        socket.emit("dashboard:clientes:update", topClientes);
      } catch (err) {
        console.error("❌ erro refresh clientes:", err);
        socket.emit("dashboard:error", { message: "Erro ao atualizar clientes" });
      }
    });
  });
};