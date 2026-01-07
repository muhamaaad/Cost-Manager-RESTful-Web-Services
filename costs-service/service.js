const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Costs Service (REST API):
 * Responsible for cost management and monthly reports.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Cost = require('../models/Cost');
const Report = require('../models/Report');
const Log = require('../models/Log');
const User = require('../models/User');

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
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Costs Service connected to MongoDB Atlas'))
    .catch(err => logger.error(err, 'Database connection error'));

// POST /api/add: add a new cost item
app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, date } = req.body;

        // Basic validation
        if (!description || !category || !userid || !sum) {
            return res.status(400).json({ id: 400, message: 'Missing required fields' });
        }

        // Verify user exists
        const existingUser = await User.findOne({ id: Number(userid) });
        if (!existingUser) {
            return res.status(400).json({ id: 400, message: 'User does not exist' });
        }

        const costDate = date ? new Date(date) : new Date();

        // Disallow adding costs with dates in the past
        const now = new Date();
        if (costDate.getTime() < now.getTime()) {
            return res.status(400).json({ id: 400, message: 'Cost date cannot be in the past' });
        }

        const newCost = new Cost({
            description,
            category,
            userid: Number(userid),
            sum,
            year: costDate.getFullYear(),
            month: costDate.getMonth() + 1,
            day: costDate.getDate()
        });

        await newCost.save();

        res.status(201).json({
            userid: newCost.userid,
            description: newCost.description,
            category: newCost.category,
            sum: newCost.sum,
            year: newCost.year,
            month: newCost.month,
            day: newCost.day
        });

    } catch (error) {
        res.status(400).json({ id: 400, message: error.message });
    }
});


/*
 * GET /api/report implements Computed Design Pattern:
 * - If month already passed => cache report in reports collection.
 * - If current/future month => compute and return, but do NOT save.
 */
app.get('/api/report', async (req, res) => {
    try {
        const userid = Number(req.query.id);
        const year = Number(req.query.year);
        const month = Number(req.query.month);

        if (!userid || !year || !month) {
            return res.status(400).json({ id: 400, message: 'Missing or invalid id/year/month' });
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const isPastMonth = (year < currentYear) || (year === currentYear && month < currentMonth);

        // Only use cached report for past months
        if (isPastMonth) {
            const existingReport = await Report.findOne({ userid, year, month }, { _id: 0, __v: 0 });
            if (existingReport) {
                return res.status(200).json(existingReport);
            }
        }

        const costs = await Cost.find({ userid, year, month });

        const categories = ['food', 'health', 'housing', 'sports', 'education'];
        const reportData = categories.map(cat => ({
            [cat]: costs
                .filter(c => c.category === cat)
                .map(c => ({ sum: c.sum, description: c.description, day: c.day }))
        }));

        const report = { userid, year, month, costs: reportData };

        // Cache only if month already passed
        if (isPastMonth) {
            await new Report(report).save();
        }

        res.status(200).json(report);

    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3002;

app.listen(PORT, () => {
    logger.info(`Costs Service is running on http://localhost:${PORT}`);
});
