const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const { setupTabelaSocket } = require("./middlewares/tabelaSocket");
const setupDashboardSocket = require("./middlewares/dashboardSocket"); // ✅ novo socket

const PORT = process.env.PORT || 3000;

// Cria o servidor HTTP com Express
const server = http.createServer(app);

// Inicia o Socket.IO em cima do servidor HTTP
const io = new Server(server, {
  cors: {
    origin: "*", // Ajuste depois se quiser limitar
    methods: ["GET", "POST"],
  },
});

// ✅ Configura os eventos do socket já existentes
setupTabelaSocket(io);

// ✅ Configura os eventos do dashboard em tempo real
setupDashboardSocket(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em ${PORT}`);
});