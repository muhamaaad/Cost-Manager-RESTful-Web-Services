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

// Connect to MongoDB Atlas
const uri = process.env.MONGODB_URI;
if (!uri) {
    logger.error('MONGODB_URI is undefined. Check your .env file location and format.');
    process.exit(1);
}

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
        const { id, first_name, last_name, birthday } = req.body;

        const newUser = new User({ id, first_name, last_name, birthday });
        await newUser.save();

        res.status(201).json({
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            birthday: newUser.birthday
        });

    } catch (error) {
        res.status(400).json({ id: 400, message: error.message });
    }
});

/*
 * GET /api/users
 * Returns all users (clean JSON).
 */
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { _id: 0, __v: 0 });
        res.status(200).json(users);
    } catch (error) {
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
        const userId = Number(req.params.id);

        if (!userId) {
            return res.status(400).json({ id: 400, message: 'Invalid user id' });
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ id: 404, message: 'User not found' });
        }

        // Compute total costs for this user
        const totalAgg = await Cost.aggregate([
            { $match: { userid: userId } },
            { $group: { _id: null, total: { $sum: '$sum' } } }
        ]);

        const total = totalAgg.length ? totalAgg[0].total : 0;

        res.status(200).json({
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            total
        });

    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3001;

// Start Users Service HTTP server
app.listen(PORT, () => {
    logger.info(`Users Service is running on http://localhost:${PORT}`);
});
