const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Logs (Admin) Service:
 * Dedicated service responsible for exposing system logs.
 * Separating logs into their own process keeps logging concerns isolated
 * from business logic (users, costs) and simplifies monitoring and debugging.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Log = require('../models/Log');
const app = express();
app.use(express.json());

// Connect to MongoDB Atlas using shared project configuration
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Logs Service connected to MongoDB Atlas'))
    .catch(err => logger.error('Database connection error'));

    // GET /api/logs: return all log entries recorded by the system
app.get('/api/logs', async (req, res) => {
    try {
        // Fetch all log documents from the logs collection for inspection/auditing
        const logs = await Log.find({});
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3003;

// Start Logs Service HTTP server on a dedicated port (separate admin process)
app.listen(PORT, () => {
    logger.info(`Logs Service is running on http://localhost:${PORT}`);
});