const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Cost = require('../models/Cost');
const Report = require('../models/Report');
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

mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Costs Service connected to MongoDB Atlas'))
    .catch(err => logger.error('Database connection error'));

app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, date } = req.body;
        const costDate = date ? new Date(date) : new Date();

        const newCost = new Cost({
            description,
            category,
            userid,
            sum,
            year: costDate.getFullYear(),
            month: costDate.getMonth() + 1,
            day: costDate.getDate()
        });

        await newCost.save();
        res.status(201).json(newCost);
    } catch (error) {
        res.status(400).json({ id: 400, message: error.message });
    }
});

app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        const existingReport = await Report.findOne({ userid: id, year, month });
        if (existingReport) {
            return res.status(200).json(existingReport);
        }

        const costs = await Cost.find({ userid: id, year, month });

        const categories = ['food', 'health', 'housing', 'sports', 'education'];
        const reportData = categories.map(cat => {
            return {
                [cat]: costs
                    .filter(c => c.category === cat)
                    .map(c => ({ sum: c.sum, description: c.description, day: c.day }))
            };
        });

        const newReport = new Report({
            userid: id,
            year,
            month,
            costs: reportData
        });

        await newReport.save();
        res.status(200).json(newReport);

    } catch (error) {
        res.status(500).json({ id: 500, message: error.message });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    logger.info(`Costs Service is running on http://localhost:${PORT}`);
});