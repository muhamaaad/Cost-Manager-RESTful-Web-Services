const express = require('express');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

/*
 * Developer (Admin) Service:
 * Exposes metadata about the development team.
 * Returns only first_name and last_name as required.
 */
const app = express();

// GET /api/about: return development team members
// Response includes only first_name and last_name (no additional fields)
app.get('/api/about', (req, res) => {
    res.status(200).json([
        { first_name: 'muhamad', last_name: 'egbaria' },
        { first_name: 'amit', last_name: 'or' }
    ]);
});

const PORT = 3004;

// Start Developer Service HTTP server
app.listen(PORT, () => {
    logger.info(`Developer Service is running on http://localhost:${PORT}`);
});
