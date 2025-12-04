const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  authProvider: { type: String, enum: ['manual', 'google'], required: true },
  googleId: { type: String },
  picture: String,
  tokenBalance: { type: Number, default: 500 },
  notifications: [
    {
      type: { type: String },
      message: String,
      requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'print_requests' },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
})

module.exports = mongoose.model('users', userSchema)
