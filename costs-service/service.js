const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Costs Service (REST API):
 * Responsible for cost management and monthly reports.
 * Uses environment variables from the project root (.env) to connect to MongoDB Atlas.
 */
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Cost = require('../models/Cost');
const Report = require('../models/Report');
const Log = require('../models/Log');

const app = express();
app.use(express.json());

// Request logging middleware:
// On response finish, persist request metadata to MongoDB (logs collection)
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

// Connect to MongoDB Atlas using MONGODB_URI from .env (shared DB for all processes)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Costs Service connected to MongoDB Atlas'))
    .catch(err => logger.error('Database connection error'));

 // POST /api/add: add a new cost item (description, category, userid, sum, optional date)
app.post('/api/add', async (req, res) => {
    try {
        // Extract request payload and compute the cost date (server time used if client did not provide date)
        const { description, category, userid, sum, date } = req.body;
        const costDate = date ? new Date(date) : new Date();

        // Build a Cost document, including computed fields (year/month/day) for efficient reporting queries
        const newCost = new Cost({
            description,
            category,
            userid,
            sum,
            year: costDate.getFullYear(),
            month: costDate.getMonth() + 1,
            day: costDate.getDate()
        });

        // Persist the cost item to the costs collection
        await newCost.save();
        res.status(201).json(newCost);
    } catch (error) {
        res.status(400).json({ id: 400, message: error.message });
    }
});


/*
 * GET /api/report implements the Computed Design Pattern:
 * - When a report is requested, the service first checks if a computed report already exists in the reports collection.
 * - If it exists, return it immediately (avoid recomputing).
 * - Otherwise, compute the report from the costs collection, store it, and return it.
 * Note: The project rules prevent adding costs with past dates, helping keep computed reports consistent.
 */
app.get('/api/report', async (req, res) => {
    try {
        // Read report query parameters (userid, year, month) from the query string
        const { id, year, month } = req.query;


        // Computed check: if a report for this (userid, year, month) was already generated, return cached version
        const existingReport = await Report.findOne({ userid: id, year, month });
        if (existingReport) {
            return res.status(200).json(existingReport);
        }

        // If no cached report exists, fetch all matching cost items for the requested period
        const costs = await Cost.find({ userid: id, year, month });

        // Group cost items by required categories and shape the response according to the project JSON format
        const categories = ['food', 'health', 'housing', 'sports', 'education'];
        const reportData = categories.map(cat => {
            return {
                [cat]: costs
                    .filter(c => c.category === cat)
                    .map(c => ({ sum: c.sum, description: c.description, day: c.day }))
            };
        });

        // Persist the newly computed report so future requests can reuse it (computed/cached report)
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


// Start Costs Service HTTP server on a dedicated port (separate process)
const PORT = 3002;
app.listen(PORT, () => {
    logger.info(`Costs Service is running on http://localhost:${PORT}`);
});