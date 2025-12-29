const express = require('express');
const logger = require('pino')({ transport: { target: 'pino-pretty' } });

const app = express();

app.get('/api/developers', (req, res) => {
    res.status(200).json([
        {
            firstname: "muhamad",
            lastname: "egbaria",
            id: 123456789,
            email: "muhamad@example.com"
        }
    ]);
});

const PORT = 3004;
app.listen(PORT, () => {
    logger.info(`Developer Service is running on http://localhost:${PORT}`);
});