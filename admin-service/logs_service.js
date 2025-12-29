const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Log = require('../models/Log');
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Logs Service connected to MongoDB Atlas'))
    .catch(err => logger.error('Database connection error'));

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({});
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3003;
app.listen(PORT, () => {
    logger.info(`Logs Service is running on http://localhost:${PORT}`);
});