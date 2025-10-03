const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
const { setupTabelaSocket } = require('./middlewares/tabelaSocket');

const PORT = 3000;

// Cria o servidor HTTP com Express
const server = http.createServer(app);

// Inicia o Socket.IO em cima do servidor HTTP
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: [
      'http://localhost:5173',
      'https://dea-rom.vercel.app', // troca pelo teu domínio
    ],
    methods: ['GET', 'POST']
  },
})

// Configura os eventos do socket
setupTabelaSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
