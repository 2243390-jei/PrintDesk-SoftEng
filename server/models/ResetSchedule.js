// server/models/ResetSchedule.js
const mongoose = require('mongoose');

const resetScheduleSchema = new mongoose.Schema({
  resetDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'executed', 'cancelled'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  executedAt: {
    type: Date
  },
  initiatedBy: {
    type: String,
    default: 'admin'
  }
});

module.exports = mongoose.model('ResetSchedule', resetScheduleSchema);