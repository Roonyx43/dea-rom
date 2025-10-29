// middlewares/tabelaSocket.js
const RAW_DEFAULT = Number(process.env.TABELA_DEFAULT_DIAS);
const DEFAULT_DIAS = Number.isFinite(RAW_DEFAULT) ? Math.min(Math.max(RAW_DEFAULT, 1), 365) : 30;
const CALL_TIMEOUT_MS = 30000;
const POLL_MS = 10000;

let pollTimer = null;
let activeSockets = 0;
let POLL_STARTED = false;

// controle de corrida por função
const inFlight = {
  cadastrados: false,
  aguardando: false,
};

// cache p/ emitir só quando mudar
let last = {
  cadastrados: null,
  aguardando: null,
};

function shallowEqual(a, b) {
  // compare rápido: tamanho e JSON (suficiente p/ dashboard)
  if (a === b) return true;
  const aj = JSON.stringify(a || []);
  const bj = JSON.stringify(b || []);
  return aj === bj;
}

function callController(fn, dias, onOk, label) {
  let done = false;
  const started = Date.now();

  const finish = (ok, payloadOrErr) => {
    if (done) return;
    done = true;
    const ms = Date.now() - started;
    if (!ok) console.error(`[tabelaSocket] ${label} error:`, payloadOrErr?.message || payloadOrErr);
    else onOk(payloadOrErr || []);
    console.log(`[tabelaSocket] ${label} finished in ${ms}ms (ok=${ok})`);
  };

  try {
    const t = setTimeout(() => finish(false, new Error(`timeout after ${CALL_TIMEOUT_MS}ms`)), CALL_TIMEOUT_MS);
    const ret = fn(dias, (err, rows) => {
      clearTimeout(t);
      if (err) return finish(false, err);
      finish(true, Array.isArray(rows) ? rows : []);
    });
    if (ret && typeof ret.then === 'function') {
      ret.then(rows => { clearTimeout(t); finish(true, Array.isArray(rows) ? rows : []); })
         .catch(err => { clearTimeout(t); finish(false, err); });
    }
  } catch (e) { finish(false, e); }
}

function pollOnce(io) {
  // cadastrados
  if (!inFlight.cadastrados) {
    inFlight.cadastrados = true;
    callController(require('../controllers/tabelaController').buscarCadastradosPorDias, DEFAULT_DIAS, rows => {
      if (!shallowEqual(rows, last.cadastrados)) {
        last.cadastrados = rows;
        io.emit('tabelaCadastradosAtualizada', rows);
        console.log('[poll] emit cadastrados ->', rows?.length ?? 0);
      }
      inFlight.cadastrados = false;
    }, 'buscarCadastradosPorDias(poll)');
  }

  // aguardando financeiro
  if (!inFlight.aguardando) {
    inFlight.aguardando = true;
    callController(require('../controllers/tabelaController').buscarAguardandoFinanceiroPorDias, DEFAULT_DIAS, rows => {
      if (!shallowEqual(rows, last.aguardando)) {
        last.aguardando = rows;
        io.emit('tabelaAguardandoFinanceiroAtualizada', rows);
        console.log('[poll] emit aguardando ->', rows?.length ?? 0);
      }
      inFlight.aguardando = false;
    }, 'buscarAguardandoFinanceiroPorDias(poll)');
  }
}

function startPolling(io) {
  if (pollTimer) return;
  pollTimer = setInterval(() => pollOnce(io), POLL_MS);
  console.log('[poll] started');
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
  console.log('[poll] stopped');
}

function setupTabelaSocket(io) {
  if (POLL_STARTED) return;
  POLL_STARTED = true;

  const ctrl = require('../controllers/tabelaController');

  io.on('connection', (socket) => {
    activeSockets += 1;
    console.log('[socket] conectado', socket.id, 'ativos:', activeSockets);
    if (activeSockets === 1) startPolling(io);

    // snapshots no connect
    callController(ctrl.buscarCadastradosPorDias, DEFAULT_DIAS, rows => {
      last.cadastrados = rows; // inicializa cache
      socket.emit('tabelaCadastradosAtualizada', rows);
    }, 'buscarCadastradosPorDias(snapshot)');

    callController(ctrl.buscarAguardandoFinanceiroPorDias, DEFAULT_DIAS, rows => {
      last.aguardando = rows; // inicializa cache
      socket.emit('tabelaAguardandoFinanceiroAtualizada', rows);
    }, 'buscarAguardandoFinanceiroPorDias(snapshot)');

    socket.on('disconnect', () => {
      activeSockets -= 1;
      console.log('[socket] desconectado', socket.id, 'ativos:', activeSockets);
      if (activeSockets <= 0) stopPolling();
    });
  });
}

module.exports = { setupTabelaSocket };