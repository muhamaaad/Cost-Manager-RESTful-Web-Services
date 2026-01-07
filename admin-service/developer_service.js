const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Developer (Admin) Service:
 * Exposes metadata about the development team.
 * Logs every request to MongoDB (logs collection).
 * This service does not perform any business logic.
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
    .then(() => logger.info('Admin Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

/*
 * Logging middleware:
 * Saves every HTTP request to MongoDB (logs collection).
 * Ensures final HTTP status code is stored.
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
            // Logging must never affect response flow
            logger.error(error, 'Failed to write log');
        }
    });
    next();
});

/*
 * GET /api/about
 * Returns static information about the project developers.
 * Response includes first_name and last_name only, as required.
 */
app.get('/api/about', (req, res) => {
    res.status(200).json([
        { first_name: 'muhamad', last_name: 'egbaria' },
        { first_name: 'amit', last_name: 'or' }
    ]);
});

const PORT = 3004;

// Start server only when running directly (not during unit tests)
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Developers Service is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
