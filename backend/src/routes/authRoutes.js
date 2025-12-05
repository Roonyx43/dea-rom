// src/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/mysql');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { user, password } = req.body;

  if (!user || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
  }

  try {
    const sql = 'SELECT id, user, password, permissoesDashboard FROM users WHERE user = ? LIMIT 1';
    const [rows] = await pool.query(sql, [user]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos' });
    }

    const dbUser = rows[0];

    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos' });
    }

    const token = jwt.sign(
      {
        id: dbUser.id,
        user: dbUser.user,
        permissoesDashboard: dbUser.permissoesDashboard, // opcional, mas ajuda em alguns casos
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        id: dbUser.id,
        user: dbUser.user,
        permissoesDashboard: dbUser.permissoesDashboard,
      },
    });

  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;