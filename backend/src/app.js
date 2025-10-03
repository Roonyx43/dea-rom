const express = require('express');
const cors = require('cors')
const app = express();
app.use(express.json());
app.use(cors())

const tabelaRoutes = require('./routes/tabelaRoutes');
app.use('/api', tabelaRoutes);

const ticketsRoutes = require('./routes/ticketsRoutes');
app.use('/api', ticketsRoutes)

module.exports = app;
