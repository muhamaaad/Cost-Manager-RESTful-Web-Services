const mongoose = require('mongoose');

const costSchema = new mongoose.Schema({
    userid: Number,
    description: String,
    category: {
        type: String,
        enum: ['food', 'health', 'housing', 'sports', 'education']
    },
    sum: Number,
    year: Number,
    month: Number,
    day: Number
});

module.exports = mongoose.model('Cost', costSchema);