const express = require('express')
const cors = require('cors')
const path = require('path')
const { connectDB } = require('./config/db')
const { loadConfig } = require('./config/host')
const routes = require('./routes')
const { notFound, errorHandler } = require('./middleware/errorHandler')

// connect to DB (uses env MONGO_URI if present)
connectDB().catch((err) => console.error('DB connect failed:', err))

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Serve static client files from root directory
app.use(express.static(path.join(__dirname, '..')))

// Serve client config BEFORE other routes
app.get('/api/config', (req, res) => {
  const config = loadConfig()
  res.json({ publicUrl: config.publicUrl })
})

// API routes
app.use('/', routes)

// 404 + error handlers
app.use(notFound)
app.use(errorHandler)

module.exports = app
