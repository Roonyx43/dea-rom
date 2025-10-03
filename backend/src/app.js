const express = require('express');
const cors = require('cors')
const app = express();
app.use(express.json());
app.use(cors())

app.get('/health', (req, res) => res.json({ ok: true }));

const tabelaRoutes = require('./routes/tabelaRoutes');
app.use('/api', tabelaRoutes);

const ticketsRoutes = require('./routes/ticketsRoutes');
app.use('/api', ticketsRoutes)

module.exports = app;
