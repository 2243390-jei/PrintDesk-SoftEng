const mongoose = require('mongoose')

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGO_URI || "mongodb+srv://root:root123360@software-engineering.vw1nyls.mongodb.net/Software-Engineering?retryWrites=true&w=majority"
  try {
    await mongoose.connect(mongoUri)
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    throw err
  }
}

module.exports = { connectDB }
