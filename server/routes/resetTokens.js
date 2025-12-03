// server/routes/resetTokens.js
const express = require('express');
const router = express.Router();
const ResetSchedule = require('../models/ResetSchedule');
const User = require('../models/User'); // Make sure you have a User model

// Schedule a token reset
router.post('/reset-tokens', async (req, res) => {
  try {
    const { resetDate } = req.body;
    
    if (!resetDate) {
      return res.status(400).json({ error: 'Reset date is required' });
    }
    
    // Delete any existing schedules
    await ResetSchedule.deleteMany({ status: 'scheduled' });
    
    // Create new schedule
    const schedule = new ResetSchedule({
      resetDate: new Date(resetDate),
      status: 'scheduled'
    });
    
    await schedule.save();
    
    res.json({
      success: true,
      message: `Token reset scheduled for ${new Date(resetDate).toLocaleDateString()}`,
      resetId: schedule._id,
      resetDate: schedule.resetDate
    });
  } catch (error) {
    console.error('Error scheduling token reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a scheduled reset
router.post('/cancel-reset', async (req, res) => {
  try {
    const result = await ResetSchedule.updateMany(
      { status: 'scheduled' },
      { $set: { status: 'cancelled' } }
    );
    
    res.json({ 
      success: true, 
      message: 'Token reset cancelled',
      cancelledCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error cancelling token reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current scheduled reset
router.get('/reset-tokens/scheduled', async (req, res) => {
  try {
    const schedule = await ResetSchedule.findOne({ status: 'scheduled' });
    
    if (!schedule) {
      return res.status(404).json({ error: 'No reset scheduled' });
    }
    
    res.json({
      _id: schedule._id,
      resetDate: schedule.resetDate,
      status: schedule.status
    });
  } catch (error) {
    console.error('Error getting scheduled reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute token reset immediately
router.post('/reset-tokens/execute', async (req, res) => {
  try {
    // Reset all users' tokens to 500
    const result = await User.updateMany(
      {}, 
      { $set: { tokenBalance: 500 } }
    );
    
    // Update any scheduled reset as executed
    await ResetSchedule.updateMany(
      { status: 'scheduled' },
      { 
        $set: { 
          status: 'executed',
          executedAt: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: `Successfully reset tokens for ${result.modifiedCount} users`,
      usersUpdated: result.modifiedCount
    });
  } catch (error) {
    console.error('Error executing token reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check and execute scheduled resets (can be called by frontend or cron)
router.post('/reset-tokens/check-scheduled', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find scheduled resets that should happen today
    const scheduledResets = await ResetSchedule.find({
      status: 'scheduled',
      resetDate: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (scheduledResets.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No resets scheduled for today',
        executed: false 
      });
    }
    
    // Execute the reset
    const result = await User.updateMany(
      {}, 
      { $set: { tokenBalance: 500 } }
    );
    
    // Mark schedules as executed
    await ResetSchedule.updateMany(
      { _id: { $in: scheduledResets.map(r => r._id) } },
      { 
        $set: { 
          status: 'executed',
          executedAt: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: `Executed ${scheduledResets.length} scheduled resets, updated ${result.modifiedCount} users`,
      executed: true,
      usersUpdated: result.modifiedCount
    });
  } catch (error) {
    console.error('Error checking scheduled resets:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;