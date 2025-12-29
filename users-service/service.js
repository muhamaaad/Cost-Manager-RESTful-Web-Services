const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Log = require('../models/Log');

const app = express();
app.use(express.json());

app.use(async (req, res, next) => {
    res.on('finish', async () => {
        try {
            const newLog = new Log({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode
            });
            await newLog.save();
        } catch (error) {
            console.error('Logging error:', error);
        }
    });
    next();
});

const uri = process.env.MONGODB_URI;
if (!uri) {
    logger.error('MONGODB_URI is undefined. Check your .env file location and format.');
    process.exit(1);
}

mongoose.connect(uri)
    .then(() => logger.info('Users Service connected to MongoDB Atlas'))
    .catch(err => {
        logger.error('Database connection error');
        console.error('Detail:', err.message);
    });

app.post('/api/add', async (req, res) => {
    try {
        const { id, first_name, last_name, birthday } = req.body;
        const newUser = new User({ id, first_name, last_name, birthday });
        await newUser.save();
        logger.info(`User added successfully: ${id}`);
        res.status(201).json(newUser);
    } catch (error) {
        logger.error(`Error adding user: ${error.message}`);
        res.status(400).json({ id: 400, message: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ id: 404, message: "User not found" });
        }
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
app.listen(PORT, () => {
    logger.info(`Users Service is running on http://localhost:${PORT}`);
});