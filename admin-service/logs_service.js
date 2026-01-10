const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Logs (Admin) Service:
 * Dedicated service responsible for exposing system logs.
 * This service allows administrators to inspect all logged HTTP activity.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Log = require('../models/Log');
const app = express();
app.use(express.json());

/*
 * Database connection:
 * Validate environment variable and connect to MongoDB Atlas on startup.
 */
const uri = process.env.MONGODB_URI;

// Ensure MongoDB connection string exists
if (!uri) {
    logger.error('MONGODB_URI is undefined. Check your .env file location and format.');
    process.exit(1);
}

// Establish MongoDB connection and log the result
mongoose.connect(uri)
    .then(() => logger.info('Logs Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

/*
 * Middleware:
 * Log every HTTP request after response is finished.
 * This ensures the final HTTP status code is captured.
 */
app.use((req, res, next) => {
    res.on('finish', async () => {
        try {
            // Persist request metadata into logs collection
            await Log.create({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode
            });
        } catch (error) {
            // Logging failures must not affect request lifecycle
            logger.error(error, 'Failed to write log');
        }
    });
    next();
});

/*
 * GET /api/logs
 * Returns all log entries in clean JSON format.
 */
app.get('/api/logs', async (req, res) => {
    try {
        // Fetch all logs, hide MongoDB internal fields, sort by timestamp
        const logs = await Log
            .find({}, { _id: 0, __v: 0 })
            .sort({ timestamp: 1 });

        res.status(200).json(logs);
    } catch (error) {
        // Return required error shape: { id, message }
        res.status(500).json({ id: 500, message: error.message });
    }
});
const PORT = process.env.PORT || 3003;

// Start server only when running directly (not during unit tests)
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Logs Service is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
