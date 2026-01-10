const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Users Service (REST API):
 * Responsible for users management and user details.
 * Also computes total costs for a specific user.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Cost = require('../models/Cost');
const Log = require('../models/Log');

const app = express();
app.use(express.json());

/*
 * Middleware:
 * Log every HTTP request after response is finished.
 * This ensures we store the final status code in MongoDB.
 */
app.use((req, res, next) => {
    res.on('finish', async () => {
        try {
            // Persist request metadata for later review
            await Log.create({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode
            });
        } catch (error) {
            // Never break the main flow because of logging failures
            logger.error(error, 'Failed to write log');
        }
    });
    next();
});

/*
 * Database connection:
 * Validate required env var and connect to MongoDB Atlas once on startup.
 */
const uri = process.env.MONGODB_URI;

// Validate environment variable before trying to connect
if (!uri) {
    logger.error('MONGODB_URI is undefined. Check your .env file location and format.');
    process.exit(1);
}

// Connect to MongoDB Atlas and log the result
mongoose.connect(uri)
    .then(() => logger.info('Users Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

/*
 * POST /api/add
 * Adds a new user.
 * Returns clean JSON (no _id / __v).
 */
app.post('/api/add', async (req, res) => {
    try {
        // Extract user fields from request body
        const { id, first_name, last_name, birthday } = req.body;

        // Create and persist a new user document
        const newUser = new User({ id, first_name, last_name, birthday });
        await newUser.save();

        // Return sanitized response using the required property names
        res.status(201).json({
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            birthday: newUser.birthday
        });

    } catch (error) {
        // Return required error shape: { id, message }
        res.status(400).json({ id: 400, message: error.message });
    }
});

/*
 * GET /api/users
 * Returns all users (clean JSON).
 */
app.get('/api/users', async (req, res) => {
    try {
        // Query all users and hide MongoDB internal fields
        const users = await User.find({}, { _id: 0, __v: 0 });
        res.status(200).json(users);
    } catch (error) {
        // Return required error shape: { id, message }
        res.status(500).json({ id: 500, message: error.message });
    }
});

/*
 * GET /api/users/:id
 * Returns user details + total costs of that user.
 * Reply properties: first_name, last_name, id, total
 */
app.get('/api/users/:id', async (req, res) => {
    try {
        // Parse and validate user id param (business id, not MongoDB _id)
        const userId = Number(req.params.id);

        if (!userId) {
            return res.status(400).json({ id: 400, message: 'Invalid user id' });
        }

        // Fetch the user by the "id" field defined in the project requirements
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ id: 404, message: 'User not found' });
        }

        // Aggregate total costs for this user from the costs collection
        const totalAgg = await Cost.aggregate([
            { $match: { userid: userId } },
            { $group: { _id: null, total: { $sum: '$sum' } } }
        ]);

        // Default to 0 if there are no matching costs
        const total = totalAgg.length ? totalAgg[0].total : 0;

        // Return the exact reply properties required by the project document
        res.status(200).json({
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            total
        });

    } catch (error) {
        // Return required error shape: { id, message }
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = process.env.PORT || 3001;

// Start server only when running directly (not during unit tests)
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`User Service is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
