const TokenReset = require('../models/TokenReset')
const User = require('../models/User')

const scheduleReset = async (req, res) => {
  try {
    const { resetDate } = req.body
    if (!resetDate) return res.status(400).json({ error: 'Reset date is required' })

    const existingReset = await TokenReset.findOne({ executed: false, cancelled: false, resetDate: { $gte: new Date() } })
    if (existingReset) return res.status(400).json({ error: 'A token reset is already scheduled', existingReset: { _id: existingReset._id, resetDate: existingReset.resetDate } })

    const tokenReset = new TokenReset({ resetDate: new Date(resetDate), scheduledBy: 'admin' })
    await tokenReset.save()
    res.json({ message: 'Token reset scheduled successfully', resetId: tokenReset._id, resetDate: tokenReset.resetDate })
  } catch (err) {
    console.error('Error scheduling token reset:', err)
    res.status(500).json({ error: 'Failed to schedule token reset', details: err.message })
  }
}

const cancelReset = async (req, res) => {
  try {
    const scheduledReset = await TokenReset.findOne({ executed: false, cancelled: false, resetDate: { $gte: new Date() } })
    if (!scheduledReset) return res.status(404).json({ error: 'No active token reset scheduled' })
    scheduledReset.cancelled = true
    scheduledReset.cancelledAt = new Date()
    await scheduledReset.save()
    res.json({ message: 'Token reset cancelled successfully', cancelledReset: { _id: scheduledReset._id, resetDate: scheduledReset.resetDate } })
  } catch (err) {
    console.error('Error cancelling token reset:', err)
    res.status(500).json({ error: 'Failed to cancel token reset', details: err.message })
  }
}

const getScheduled = async (req, res) => {
  try {
    const scheduledReset = await TokenReset.findOne({ executed: false, cancelled: false, resetDate: { $gte: new Date() } }).sort({ resetDate: 1 })
    if (!scheduledReset) return res.status(404).json({ error: 'No token reset scheduled' })
    res.json({ _id: scheduledReset._id, resetDate: scheduledReset.resetDate, scheduledBy: scheduledReset.scheduledBy, createdAt: scheduledReset.createdAt })
  } catch (err) {
    console.error('Error getting scheduled reset:', err)
    res.status(500).json({ error: 'Failed to get scheduled reset', details: err.message })
  }
}

const executeReset = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const scheduledResets = await TokenReset.find({ resetDate: { $lte: today }, executed: false, cancelled: false })
    if (scheduledResets.length === 0) return res.json({ message: 'No token resets scheduled for today' })
    const result = await User.updateMany({}, { $set: { tokenBalance: 500 } })
    await TokenReset.updateMany({ _id: { $in: scheduledResets.map(r => r._id) } }, { executed: true, executedAt: new Date() })
    res.json({ message: 'Token reset executed successfully', usersUpdated: result.modifiedCount })
  } catch (err) {
    console.error('Error executing token reset:', err)
    res.status(500).json({ error: 'Failed to execute token reset', details: err.message })
  }
}

module.exports = { scheduleReset, cancelReset, getScheduled, executeReset }
