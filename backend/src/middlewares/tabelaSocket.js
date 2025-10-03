const {
  buscarCadastradosPorDias,            // novo wrapper (Liberado)
  buscarOrcamentosAprovadosPorDias,    // OL (mantido)
  buscarAguardandoFinanceiroPorDias    // novo wrapper (Bloqueado)
} = require('../controllers/tabelaController');

const DEFAULT_DIAS = 30;

let ultimoCadastrados = null;
let ultimoAprovados = null;
let ultimoAguardando = null;

function safeStringify(obj) {
  try { return JSON.stringify(obj); } catch { return ''; }
}

function setupTabelaSocket(io) {
  io.on('connection', (socket) => {
    // snapshot inicial pra quem conectou agora
    buscarCadastradosPorDias(DEFAULT_DIAS, (err, dados) => {
      if (!err) socket.emit('tabelaCadastradosAtualizada', dados || []);
    });

    buscarOrcamentosAprovadosPorDias(DEFAULT_DIAS, (err, dados) => {
      if (!err) socket.emit('tabelaAprovadosAtualizada', dados || []);
    });

    buscarAguardandoFinanceiroPorDias(DEFAULT_DIAS, (err, dados) => {
      if (!err) socket.emit('tabelaAguardandoFinanceiroAtualizada', dados || []);
    });
  });

  // pool periódico p/ todos
  setInterval(() => {
    buscarCadastradosPorDias(DEFAULT_DIAS, (err, dados) => {
      if (err) return;
      const novo = safeStringify(dados || []);
      const antigo = safeStringify(ultimoCadastrados);
      if (novo !== antigo) {
        ultimoCadastrados = dados || [];
        io.emit('tabelaCadastradosAtualizada', ultimoCadastrados);
      }
    });

    buscarOrcamentosAprovadosPorDias(DEFAULT_DIAS, (err, dados) => {
      if (err) return;
      const novo = safeStringify(dados || []);
      const antigo = safeStringify(ultimoAprovados);
      if (novo !== antigo) {
        ultimoAprovados = dados || [];
        io.emit('tabelaAprovadosAtualizada', ultimoAprovados);
      } 
    });

    buscarAguardandoFinanceiroPorDias(DEFAULT_DIAS, (err, dados) => {
      if (err) return;
      const novo = safeStringify(dados || []);
      const antigo = safeStringify(ultimoAguardando);
      if (novo !== antigo) {
        ultimoAguardando = dados || [];
        io.emit('tabelaAguardandoFinanceiroAtualizada', ultimoAguardando);
      }
    });
  }, 10000); // 10s
}

module.exports = { setupTabelaSocket };