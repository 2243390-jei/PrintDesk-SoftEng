const TokenReset = require('../models/TokenReset')
const User = require('../models/User')

const scheduleReset = async (req, res) => {
  try {
    const { resetDate } = req.body
    if (!resetDate) return res.status(400).json({ error: 'Reset date is required' })

    const existingReset = await TokenReset.findOne({
      executed: false,
      cancelled: false
    })
    if (existingReset) return res.status(400).json({ 
      error: 'A token reset is already scheduled', 
      existingReset: { _id: existingReset._id, resetDate: existingReset.resetDate } 
    })

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
    const scheduledReset = await TokenReset.findOne({ executed: false, cancelled: false })
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
    const scheduledReset = await TokenReset.findOne({ executed: false, cancelled: false }).sort({ resetDate: 1 })
    if (!scheduledReset) return res.status(404).json({ error: 'No token reset scheduled' })
    res.json({ _id: scheduledReset._id, resetDate: scheduledReset.resetDate, scheduledBy: scheduledReset.scheduledBy, createdAt: scheduledReset.createdAt })
  } catch (err) {
    console.error('Error getting scheduled reset:', err)
    res.status(500).json({ error: 'Failed to get scheduled reset', details: err.message })
  }
}

//
// Robust core: perform scheduled resets for any resetDate that has occurred (date-only comparison)
//
const performScheduledResets = async () => {
  try {
    // today date-only (local)
    const today = new Date()
    today.setHours(0,0,0,0)

    // load pending resets (don't rely on DB date comparators and timezone)
    const pending = await TokenReset.find({ executed: false, cancelled: false }).sort({ resetDate: 1 })
    if (!pending || pending.length === 0) {
      console.log('performScheduledResets: no pending token resets found')
      return { message: 'No token resets to execute', resetsExecuted: 0 }
    }

    // filter those whose date <= today (date-only)
    const toExecute = pending.filter(tr => {
      const rd = new Date(tr.resetDate)
      rd.setHours(0,0,0,0)
      return rd.getTime() <= today.getTime()
    })

    if (toExecute.length === 0) {
      console.log('performScheduledResets: no scheduled resets due yet')
      return { message: 'No token resets due today', resetsExecuted: 0 }
    }

    // Update users: set common token fields to 500.
    // Adjust/add fields if your User schema uses different names.
    const updateDoc = { $set: { tokenBalance: 500, tokens: 500 } }

    const result = await User.updateMany({}, updateDoc)

    // mark executed
    const ids = toExecute.map(r => r._id)
    await TokenReset.updateMany({ _id: { $in: ids } }, { $set: { executed: true, executedAt: new Date() } })

    console.log(`performScheduledResets: executed ${toExecute.length} resets, usersUpdated: ${result.modifiedCount ?? result.nModified ?? result.n ?? 0}`)
    return {
      message: 'Token reset executed successfully',
      resetsExecuted: toExecute.length,
      usersMatched: result.matchedCount ?? result.n ?? 0,
      usersUpdated: result.modifiedCount ?? result.nModified ?? 0
    }
  } catch (err) {
    console.error('performScheduledResets error:', err)
    // return structured error so callers (admin UI) can show it
    return { error: 'performScheduledResets failed', details: err.message || String(err) }
  }
}

const executeReset = async (req, res) => {
  try {
    const result = await performScheduledResets()
    // if result contains error, send 500 so UI shows failure
    if (result && result.error) return res.status(500).json(result)
    res.json(result)
  } catch (err) {
    console.error('Error executing token reset:', err)
    res.status(500).json({ error: 'Failed to execute token reset', details: err.message })
  }
}

const resetAllTokens = async (req, res) => {
  try {
    const result = await User.updateMany({}, { $set: { tokenBalance: 500, tokens: 500 } })
    res.json({ message: 'All user tokens have been reset to 500', usersUpdated: result.modifiedCount ?? result.nModified ?? 0, usersMatched: result.matchedCount ?? result.n ?? 0 })
  } catch (err) {
    console.error('Error resetting all tokens:', err)
    res.status(500).json({ error: 'Failed to reset all tokens', details: err.message })
  }
}

module.exports = {
  scheduleReset,
  cancelReset,
  getScheduled,
  executeReset,
  resetAllTokens,
  performScheduledResets
}