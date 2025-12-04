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
  
  // Join a user-specific room for notifications
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`)  })
  
})

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))

// For reset tokens in the userTokens in the admin side.
const resetTokensRouter = require('./routes/resetTokens');
app.use('/api', resetTokensRouter);