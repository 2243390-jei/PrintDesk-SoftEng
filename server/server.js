// Minimal server starter — uses modular app in `app.js`
const app = require('./app')
const http = require('http')
const socketIO = require('socket.io')

const PORT = process.env.PORT || 3000
const server = http.createServer(app)

// Initialize Socket.IO with CORS enabled
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Store io globally so controllers can access it
global.io = io

// Handle socket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  // Join a user-specific room for notifications
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`)
    console.log(`Socket ${socket.id} joined user:${userId}`)
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))

// For reset tokens in the userTokens in the admin side.
const resetTokensRouter = require('./routes/resetTokens');
app.use('/api', resetTokensRouter);

// Auto-cancel expired pickup requests
const PrintRequest = require('./models/PrintRequest')
const User = require('./models/User')

// Normalize any legacy one-L "Canceled" statuses to the preferred "Cancelled"
async function normalizeCanceledSpelling() {
  try {
    const res = await PrintRequest.updateMany({ status: 'Canceled' }, { $set: { status: 'Cancelled' } })
    if (res.modifiedCount && res.modifiedCount > 0) {
      console.log(`Normalized ${res.modifiedCount} request(s) from 'Canceled' to 'Cancelled'`)
    }
  } catch (err) {
    console.error('Error normalizing canceled spellings:', err)
  }
}

// Run normalization once at startup
normalizeCanceledSpelling().catch(err => console.error(err))

async function cancelExpiredRequestsOnce() {
  try {
    const now = new Date()
    // Find requests that are not completed/rejected/cancelled and have a pickupDateTime
    const candidates = await PrintRequest.find({
      status: { $nin: ['Completed', 'Rejected', 'Cancelled'] },
      pickupDateTime: { $exists: true, $ne: '' }
    })

    for (const req of candidates) {
      const pd = new Date(req.pickupDateTime)
      if (isNaN(pd.getTime())) continue // skip invalid dates

      // cancel if now is strictly greater than pickup date + 1 day
      const cutoff = new Date(pd)
      cutoff.setDate(cutoff.getDate() + 1)
      if (now > cutoff) {
        try {
          const updated = await PrintRequest.findByIdAndUpdate(req._id, { status: 'Cancelled' }, { new: true })
          // notify user if exists
          if (req.userId) {
            const fileNames = (req.documents || []).map(d => d.documentTitle).join(', ')
            const notification = { type: 'print_request_cancelled', message: `Your print request for "${fileNames}" was cancelled due to unclaimed pickup.`, requestId: req._id }
            await User.findByIdAndUpdate(req.userId, { $push: { notifications: notification } })
            if (global.io) global.io.emit(`notification:${req.userId}`, notification)
          }
          console.log(`Auto-cancelled request ${req._id} (pickup ${req.pickupDateTime})`)
        } catch (innerErr) {
          console.error('Failed to auto-cancel request', req._id, innerErr)
        }
      }
    }
  } catch (err) {
    console.error('Error while checking for expired pickup requests:', err)
  }
}

// Run once at startup, then every hour
cancelExpiredRequestsOnce().catch(err => console.error(err))
setInterval(() => cancelExpiredRequestsOnce().catch(err => console.error(err)), 1000 * 60 * 60)