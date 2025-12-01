const mongoose = require('mongoose')

const tokenResetSchema = new mongoose.Schema({
  resetDate: { type: Date, required: true },
  scheduledBy: String,
  executed: { type: Boolean, default: false },
  executedAt: Date,
  cancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('token_resets', tokenResetSchema)
