const fs = require('fs');
const path = require('path');
const Firebird = require('node-firebird');

const envPath = path.resolve(__dirname, '../../.env');
try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) return;
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    });
  }
} catch (err) {
  console.warn(`[firebird] falha ao carregar .env: ${err.message}`);
}

const prodDefaults = {
  host: 'firebird.deaquimica.ind.br',
  port: 3050,
  database: '/opt/firebird/dados/freedom.fdb',
  user: 'deatools',
  password: 'b7baf17f93',
  role: 'constab',
  autoCommit: true,
};

const homolDefaults = {
  host: '10.0.7.210',
  port: 3050,
  database: '/opt/firebird/dados/freedom_homologacao.fdb',
  user: 'deatools',
  password: 'b7baf17f93',
  role: 'constab',
  autoCommit: true,
};

function parsePort(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function buildOptions(prefix, defaults) {
  return {
    host: process.env[`${prefix}_HOST`] || defaults.host,
    port: parsePort(process.env[`${prefix}_PORT`], defaults.port),
    database: process.env[`${prefix}_DATABASE`] || defaults.database,
    user: process.env[`${prefix}_USER`] || defaults.user,
    password: process.env[`${prefix}_PASSWORD`] || defaults.password,
    role: process.env[`${prefix}_ROLE`] || defaults.role,
    autoCommit: parseBool(process.env[`${prefix}_AUTOCOMMIT`], defaults.autoCommit),
  };
}

const prodOptions = buildOptions('FIREBIRD_PROD', prodDefaults);
const homolOptions = buildOptions('FIREBIRD_HOMOL', homolDefaults);

function attach(options, callback) {
  Firebird.attach(options, (err, db) => {
    if (err) {
      console.error('Erro ao conectar no Firebird:', err);
      return callback(err, null);
    }
    callback(null, db);
  });
}

function withDb(callback) {
  attach(prodOptions, callback);
}

function withDbHomol(callback) {
  attach(homolOptions, callback);
}

const rawTarget = String(process.env.FIREBIRD_DB_TARGET || process.env.DB_TARGET || '').trim().toLowerCase();
const useProd =
  rawTarget === 'prod' ||
  rawTarget === 'producao' ||
  rawTarget === 'production' ||
  (!rawTarget && String(process.env.NODE_ENV).toLowerCase() === 'production');

const currentTarget = useProd ? 'production' : 'homolog';

if (process.env.NODE_ENV !== 'test') {
  console.log(`[firebird] conexao ativa em: ${currentTarget}`);
}

function withDbActive(callback) {
  return (useProd ? withDb : withDbHomol)(callback);
}

function getCurrentDbTarget() {
  return currentTarget;
}

module.exports = {
  withDb,
  withDbHomol,
  withDbActive,
  getCurrentDbTarget,
};
