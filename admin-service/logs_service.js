const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Logs (Admin) Service:
 * Dedicated service responsible for exposing system logs.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Log = require('../models/Log');
const app = express();
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Logs Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

/*
 * Middleware:
 * Log every HTTP request after response is finished.
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
            logger.error(error, 'Failed to write log');
        }
    });
    next();
});

// GET /api/logs: return all log entries (clean JSON)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: 1 });
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3003;

app.listen(PORT, () => {
    logger.info(`Logs Service is running on http://localhost:${PORT}`);
});
