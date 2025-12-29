const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    method: String,
    url: String,
    status: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);