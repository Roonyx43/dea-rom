// middlewares/tabelaSocket.js

const DEFAULT_DIAS = 30;

// stringify seguro para comparação de mudanças
function safeStringify(obj) {
  try { return JSON.stringify(obj); } catch { return ''; }
}

// helper: chama controller que pode ser callback ou promise
function callController(fn, dias, onOk) {
  try {
    // Suporta estilo callback(dias, cb)...
    let returned = fn(dias, (err, dados) => {
      if (err) {
        console.error('[tabelaSocket] controller error (cb):', err?.message || err);
        return;
      }
      try { onOk(dados || []); } catch (e) {
        console.error('[tabelaSocket] onOk error:', e?.message || e);
      }
    });

    // ...e também estilo Promise (se o controller retornar uma Promise)
    if (returned && typeof returned.then === 'function') {
      returned
        .then((dados) => onOk(dados || []))
        .catch((err) => console.error('[tabelaSocket] controller error (promise):', err?.message || err));
    }
  } catch (err) {
    console.error('[tabelaSocket] controller threw synchronously:', err?.message || err);
  }
}

function setupTabelaSocket(io) {
  // Lazy-require dos controllers, para evitar crash no load do módulo
  let buscarCadastradosPorDias;
  let buscarOrcamentosAprovadosPorDias;
  let buscarAguardandoFinanceiroPorDias;

  try {
    const controllers = require('../controllers/tabelaController');
    buscarCadastradosPorDias = controllers.buscarCadastradosPorDias;
    buscarOrcamentosAprovadosPorDias = controllers.buscarOrcamentosAprovadosPorDias;
    buscarAguardandoFinanceiroPorDias = controllers.buscarAguardandoFinanceiroPorDias;
  } catch (err) {
    console.error('[tabelaSocket] Falha ao carregar controllers:', err?.message || err);
    // Sem controllers -> não arma sockets (não derruba o servidor)
    return;
  }

  if (typeof buscarCadastradosPorDias !== 'function'
   || typeof buscarOrcamentosAprovadosPorDias !== 'function'
   || typeof buscarAguardandoFinanceiroPorDias !== 'function') {
    console.error('[tabelaSocket] Controllers ausentes ou inválidos.');
    return;
  }

  let ultimoCadastrados = null;
  let ultimoAprovados = null;
  let ultimoAguardando = null;

  io.on('connection', (socket) => {
    console.log('[socket] conectado', socket.id);

    // Snapshot inicial (cada um protegido)
    callController(buscarCadastradosPorDias, DEFAULT_DIAS, (dados) => {
      socket.emit('tabelaCadastradosAtualizada', dados);
    });

    callController(buscarOrcamentosAprovadosPorDias, DEFAULT_DIAS, (dados) => {
      socket.emit('tabelaAprovadosAtualizada', dados);
    });

    callController(buscarAguardandoFinanceiroPorDias, DEFAULT_DIAS, (dados) => {
      socket.emit('tabelaAguardandoFinanceiroAtualizada', dados);
    });

    socket.on('disconnect', () => {
      console.log('[socket] desconectado', socket.id);
    });
  });

  // Poll periódico (não lança erro nunca)
  setInterval(() => {
    callController(buscarCadastradosPorDias, DEFAULT_DIAS, (dados) => {
      const novo = safeStringify(dados);
      const antigo = safeStringify(ultimoCadastrados);
      if (novo !== antigo) {
        ultimoCadastrados = dados;
        io.emit('tabelaCadastradosAtualizada', ultimoCadastrados);
      }
    });

    callController(buscarOrcamentosAprovadosPorDias, DEFAULT_DIAS, (dados) => {
      const novo = safeStringify(dados);
      const antigo = safeStringify(ultimoAprovados);
      if (novo !== antigo) {
        ultimoAprovados = dados;
        io.emit('tabelaAprovadosAtualizada', ultimoAprovados);
      }
    });

    callController(buscarAguardandoFinanceiroPorDias, DEFAULT_DIAS, (dados) => {
      const novo = safeStringify(dados);
      const antigo = safeStringify(ultimoAguardando);
      if (novo !== antigo) {
        ultimoAguardando = dados;
        io.emit('tabelaAguardandoFinanceiroAtualizada', ultimoAguardando);
      }
    });
  }, 10000); // 10s
}

module.exports = { setupTabelaSocket };