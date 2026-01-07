const express = require('express');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });


/*
 * Developer (Admin) Service:
 * Exposes metadata about the development team.
 * This service is part of the admin layer and is intentionally kept simple,
 * returning static information about the project developers as required.
 */
const app = express();

// GET /api/developers: returns the list of project developers
// The response includes only developer identification details as defined by the project requirements
app.get('/api/about', (req, res) => {
    res.status(200).json([
        {
            first_name: "muhamad",
            last_name: "egbaria"
        },
        {
            first_name: "amit",
            last_name: "or"
        }
    ]);
});

const PORT = 3004;

// Start Developer Service HTTP server on a dedicated port (admin-related process)
app.listen(PORT, () => {
    logger.info(`Developer Service is running on http://localhost:${PORT}`);
});