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

// Parse JSON request bodies
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

// Connect to MongoDB Atlas (async). Service continues running; errors are logged.
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Costs Service connected to MongoDB Atlas'))
  .catch(err => logger.error(err, 'Database connection error'));

/*
 * POST /api/add:
 * Add a new cost item. Date is optional; if missing, use request time.
 */
app.post('/api/add', async (req, res) => {
  try {
    // Extract request payload (date is optional)
    const { description, category, userid, sum, date } = req.body;

    // Basic validation: required fields must exist
    if (!description || !category || userid === undefined || sum === undefined) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    // Verify user exists (userid in costs is Number, and maps to users.id)
    const existingUser = await User.findOne({ id: Number(userid) });
    if (!existingUser) {
      return res.status(400).json({ id: 400, message: 'User does not exist' });
    }

    // Use provided date if exists; otherwise use request time
    const costDate = date ? new Date(date) : new Date();

    // Disallow adding costs with dates before today (local time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Block costs that belong to past dates (project requirement)
    if (costDate.getTime() < todayStart.getTime()) {
      return res.status(400).json({ id: 400, message: 'Cost date cannot be in the past' });
    }

    // Persist cost with extracted year/month/day fields for reporting queries
    const newCost = new Cost({
      description,
      category,
      userid: Number(userid),
      sum,
      year: costDate.getFullYear(),
      month: costDate.getMonth() + 1,
      day: costDate.getDate()
    });

    // Save to DB
    await newCost.save();

    // Return clean JSON of the added cost item
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
    // Any error in this endpoint returns the required error JSON shape
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
    // Parse and validate query params
    const userid = Number(req.query.id);
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!userid || !year || !month) {
      return res.status(400).json({ id: 400, message: 'Missing or invalid id/year/month' });
    }

    // Determine current year/month for computed caching logic
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Determine whether requested month is a past month (controls caching behavior)
    const isPastMonth =
      (year < currentYear) || (year === currentYear && month < currentMonth);

    // Only use cached report for past months (computed design pattern)
    if (isPastMonth) {
      const existingReport = await Report.findOne(
        { userid, year, month },
        { _id: 0, __v: 0 }
      );
      if (existingReport) {
        return res.status(200).json(existingReport);
      }
    }

    // Fetch all costs for this user + month + year
    const costs = await Cost.find({ userid, year, month });

    // Build response JSON in the required format: costs grouped by category
    const categories = ['food', 'health', 'housing', 'sports', 'education'];
    const reportData = categories.map(cat => ({
      [cat]: costs
        .filter(c => c.category === cat)
        .map(c => ({ sum: c.sum, description: c.description, day: c.day }))
    }));

    // Final report response object
    const report = { userid, year, month, costs: reportData };

    // Computed pattern: cache report only for past months (future/current are computed-only)
    if (isPastMonth) {
      await new Report(report).save();
    }

    // Return report JSON
    res.status(200).json(report);

  } catch (error) {
    // DB/query errors return 500 with required error JSON shape
    res.status(500).json({ id: 500, message: error.message });
  }
});

const PORT = process.env.PORT || 3002;

// Start server only when running directly (not during unit tests)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Costs Service is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
