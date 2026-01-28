// middlewares/tabelaSocket.js

const RAW_DEFAULT = Number(process.env.TABELA_DEFAULT_DIAS)
const DEFAULT_DIAS = Number.isFinite(RAW_DEFAULT)
  ? Math.min(Math.max(RAW_DEFAULT, 1), 365)
  : 30

const CALL_TIMEOUT_MS = 30000
const POLL_MS = Number(process.env.TABELA_POLL_MS || 6000) // ✅ 6s por padrão

let pollTimer = null
let activeSockets = 0
let POLL_STARTED = false

const inFlight = {
  cadastrados: false,
  aguardando: false,
}

let last = {
  cadastrados: null,
  aguardando: null,
}

function shallowEqual(a, b) {
  if (a === b) return true
  return JSON.stringify(a || []) === JSON.stringify(b || [])
}

function now() {
  return new Date().toLocaleTimeString()
}

/**
 * Chama controller com:
 * - timeout
 * - suporte a callback OU promise
 * - onDone SEMPRE roda (mesmo em erro/timeout) -> evita travar o inFlight
 */
function callController(fn, dias, { onOk, onDone }, label) {
  let finished = false
  const started = Date.now()

  const finish = (ok, payloadOrErr) => {
    if (finished) return
    finished = true

    const ms = Date.now() - started

    try {
      if (!ok) {
        console.error(`[tabelaSocket] ${label} error:`, payloadOrErr?.message || payloadOrErr)
      } else {
        const rows = Array.isArray(payloadOrErr) ? payloadOrErr : []
        onOk(rows)
      }
    } finally {
      console.log(`[tabelaSocket] ${label} finished in ${ms}ms (ok=${ok})`)
      onDone?.()
    }
  }

  try {
    const timeout = setTimeout(() => {
      finish(false, new Error(`timeout after ${CALL_TIMEOUT_MS}ms`))
    }, CALL_TIMEOUT_MS)

    const ret = fn(dias, (err, rows) => {
      clearTimeout(timeout)
      if (err) return finish(false, err)
      finish(true, rows)
    })

    // suporte a promise
    if (ret && typeof ret.then === 'function') {
      ret
        .then((rows) => {
          clearTimeout(timeout)
          finish(true, rows)
        })
        .catch((err) => {
          clearTimeout(timeout)
          finish(false, err)
        })
    }
  } catch (e) {
    finish(false, e)
  }
}

function pollOnce(io, ctrl) {
  // cadastrados
  if (!inFlight.cadastrados) {
    inFlight.cadastrados = true

    callController(
      ctrl.buscarCadastradosPorDias,
      DEFAULT_DIAS,
      {
        onOk: (rows) => {
          if (!shallowEqual(rows, last.cadastrados)) {
            last.cadastrados = rows
            io.emit('tabelaCadastradosAtualizada', rows)
            console.log(`[poll ${now()}] emit cadastrados ->`, rows?.length ?? 0)
          } else {
            console.log(`[poll ${now()}] cadastrados sem mudança`)
          }
        },
        onDone: () => {
          inFlight.cadastrados = false
        },
      },
      'buscarCadastradosPorDias(poll)'
    )
  }

  // aguardando financeiro
  if (!inFlight.aguardando) {
    inFlight.aguardando = true

    callController(
      ctrl.buscarAguardandoFinanceiroPorDias,
      DEFAULT_DIAS,
      {
        onOk: (rows) => {
          if (!shallowEqual(rows, last.aguardando)) {
            last.aguardando = rows
            io.emit('tabelaAguardandoFinanceiroAtualizada', rows)
            console.log(`[poll ${now()}] emit aguardando ->`, rows?.length ?? 0)
          } else {
            console.log(`[poll ${now()}] aguardando sem mudança`)
          }
        },
        onDone: () => {
          inFlight.aguardando = false
        },
      },
      'buscarAguardandoFinanceiroPorDias(poll)'
    )
  }
}

function startPolling(io, ctrl) {
  if (pollTimer) return

  console.log(`[poll] started (interval=${POLL_MS}ms)`)

  // ✅ roda uma vez imediatamente
  try {
    pollOnce(io, ctrl)
  } catch (e) {
    console.error('[poll] crash (first run):', e)
  }

  pollTimer = setInterval(() => {
    try {
      pollOnce(io, ctrl)
    } catch (e) {
      console.error('[poll] crash:', e)
    }
  }, POLL_MS)
}

function stopPolling() {
  if (!pollTimer) return

  clearInterval(pollTimer)
  pollTimer = null

  inFlight.cadastrados = false
  inFlight.aguardando = false

  console.log('[poll] stopped')
}

function setupTabelaSocket(io) {
  if (POLL_STARTED) return
  POLL_STARTED = true

  const ctrl = require('../controllers/tabelaController')

  io.on('connection', (socket) => {
    activeSockets += 1
    console.log(`[socket ${now()}] conectado`, socket.id, 'ativos:', activeSockets)

    if (activeSockets === 1) {
      startPolling(io, ctrl)
    }

    // snapshots no connect
    callController(
      ctrl.buscarCadastradosPorDias,
      DEFAULT_DIAS,
      {
        onOk: (rows) => {
          last.cadastrados = rows
          socket.emit('tabelaCadastradosAtualizada', rows)
          console.log(`[socket ${now()}] snapshot cadastrados ->`, rows?.length ?? 0, 'para', socket.id)
        },
        onDone: () => {},
      },
      'buscarCadastradosPorDias(snapshot)'
    )

    callController(
      ctrl.buscarAguardandoFinanceiroPorDias,
      DEFAULT_DIAS,
      {
        onOk: (rows) => {
          last.aguardando = rows
          socket.emit('tabelaAguardandoFinanceiroAtualizada', rows)
          console.log(`[socket ${now()}] snapshot aguardando ->`, rows?.length ?? 0, 'para', socket.id)
        },
        onDone: () => {},
      },
      'buscarAguardandoFinanceiroPorDias(snapshot)'
    )

    socket.on('disconnect', (reason) => {
      activeSockets = Math.max(0, activeSockets - 1)
      console.log(`[socket ${now()}] desconectado`, socket.id, 'motivo:', reason, 'ativos:', activeSockets)

      if (activeSockets === 0) {
        stopPolling()
      }
    })
  })
}

module.exports = { setupTabelaSocket }