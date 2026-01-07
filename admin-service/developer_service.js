const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Developer (Admin) Service:
 * Exposes metadata about the development team.
 * Logs every request to MongoDB (logs collection).
 */

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Log = require('../models/Log');

const app = express();
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Admin Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

/*
 * Logging middleware:
 * Saves every HTTP request to MongoDB (logs collection)
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

// GET /api/about: return developers (first_name + last_name only)
app.get('/api/about', (req, res) => {
    res.status(200).json([
        { first_name: 'muhamad', last_name: 'egbaria' },
        { first_name: 'amit', last_name: 'or' }
    ]);
});

const PORT = 3004;

app.listen(PORT, () => {
    logger.info(`Developer Service is running on http://localhost:${PORT}`);
});
