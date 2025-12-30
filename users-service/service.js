const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Users Service (REST API):
 * Responsible for user CRUD endpoints.
 * Loads environment variables from the project root (.env) to connect to MongoDB Atlas.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Log = require('../models/Log');

const app = express();
app.use(express.json());

// Request logging middleware: on response finish, persist request metadata to MongoDB (logs collection)
app.use(async (req, res, next) => {
    // Use the response 'finish' event to log the final status code after the request completes
    res.on('finish', async () => {
        try {
            // Create and save a log entry for auditing/debugging (method, url, status)
            const newLog = new Log({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode
            });
            await newLog.save();
        } catch (error) {
            // Logging failures should not break the request flow
            logger.error({ err: error }, 'Logging error');
        }
    });
    next();
});

// Read MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
    // Fail fast if configuration is missing to avoid running in a broken state
    logger.error('MONGODB_URI is undefined. Check your .env file location and format.');
    process.exit(1);
}

// Connect to MongoDB Atlas using the shared project cluster
mongoose.connect(uri)
    .then(() => logger.info('Users Service connected to MongoDB Atlas'))
    .catch(err => {
        // Log both a friendly message and the technical error detail for debugging
        logger.error({ err }, 'Database connection error');
    });

// POST /api/add: add a new user document to the users collection
app.post('/api/add', async (req, res) => {
    try {
        // Extract request payload (id is a Number in the schema; birthday is a Date)
        const { id, first_name, last_name, birthday } = req.body;

        // Create and persist a new User document
        const newUser = new User({ id, first_name, last_name, birthday });
        await newUser.save();

        // Log successful user creation (useful for audit trails)
        logger.info(`User added successfully: ${id}`);
        res.status(201).json(newUser);
    } catch (error) {
        // On error, return the standard error JSON format (id + message)
        logger.error(`Error adding user: ${error.message}`);
        res.status(400).json({ id: 400, message: error.message });
    }
});

// GET /api/users: return a list of all users in the database
app.get('/api/users', async (req, res) => {
    try {
        // Fetch all users (used by the client/admin to view existing users)
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

/*
 * GET /api/users/:id:
 * Returns user details and the user's total costs.
 * The "total" is typically computed by summing the user's cost items (from the costs collection).
 * This endpoint returns only the required fields: first_name, last_name, id, total.
 */
app.get('/api/users/:id', async (req, res) => {
    try {
        // Read the user id from the URL path parameter
        const userId = req.params.id;

        // Fetch the user document by its "id" field (not MongoDB _id)
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ id: 404, message: "User not found" });
        }

        // Return the required response shape (total costs calculation can be added/connected as needed)
        res.status(200).json({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            total: 0
        });
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3001;

// Start Users Service HTTP server on a dedicated port (separate process)
app.listen(PORT, () => {
    logger.info(`Users Service is running on http://localhost:${PORT}`);
});