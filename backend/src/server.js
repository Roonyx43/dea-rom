const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
const { setupTabelaSocket } = require('./middlewares/tabelaSocket');

const PORT = process.env.PORT || 3000;

// Cria o servidor HTTP com Express
const server = http.createServer(app);

// Inicia o Socket.IO em cima do servidor HTTP
const io = new Server(server, {
  cors: {
    origin: '*', // Ajuste depois se quiser limitar
  }
});

// Configura os eventos do socket
setupTabelaSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em${PORT}`);
});
