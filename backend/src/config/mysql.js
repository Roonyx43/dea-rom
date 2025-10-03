// src/config/mysql.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'yamabiko.proxy.rlwy.net',
  port: 45244, // ⚠️ substitui pela porta que a Railway mostra no painel!
  user: 'root',
  password: 'HjdVbQNuwCioHIkmEqnizqpMRfgwEEBr',
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000,
  ssl: { rejectUnauthorized: false }, // Railway geralmente exige SSL
});

module.exports = { pool };