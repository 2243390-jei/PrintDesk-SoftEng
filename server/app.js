const express = require('express')
const cors = require('cors')
const path = require('path')
const { connectDB } = require('./config/db')
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

// API routes
app.use('/', routes)

// 404 + error handlers
app.use(notFound)
app.use(errorHandler)

module.exports = app
