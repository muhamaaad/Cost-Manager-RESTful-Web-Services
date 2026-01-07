const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Logs (Admin) Service:
 * Dedicated service responsible for exposing system logs.
 * This service logs every incoming HTTP request into MongoDB
 * as required by the project specifications.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Log = require('../models/Log');

const app = express();
app.use(express.json());

// Connect to MongoDB Atlas using shared project configuration
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Logs Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

/*
 * Middleware:
 * Logs every HTTP request after the response is completed.
 * This ensures logging for every endpoint access as required.
 */
app.use((req, res, next) => {
    res.on('finish', async () => {
        try {
            await Log.create({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode
            });
        } catch (error) {
            // Logging failures must not crash the service
            logger.error(error, 'Failed to write log to MongoDB');
        }
    });

    next();
});

// GET /api/logs: return all log entries recorded by the system
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({});
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3003;

// Start Logs Service HTTP server on a dedicated port
app.listen(PORT, () => {
    logger.info(`Logs Service is running on http://localhost:${PORT}`);
});
