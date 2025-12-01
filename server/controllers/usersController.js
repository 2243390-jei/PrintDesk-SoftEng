const User = require('../models/User')

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    console.error('Error fetching users:', err)
    res.status(500).json({ error: 'Failed to fetch users', details: err.message })
  }
}

const createUser = async (req, res) => {
  try {
    const { email, fullName, role, password } = req.body
    if (!email || !fullName || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields', required: ['email', 'fullName', 'role', 'password'] })
    }

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ error: 'User already exists' })

    if (!['student', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role', validRoles: ['student', 'admin'] })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long' })

    const newUser = new User({ email, fullName, password, role, authProvider: 'manual', tokenBalance: 500, createdAt: new Date(), lastLogin: new Date() })
    const saved = await newUser.save()

    const userResponse = { _id: saved._id, fullName: saved.fullName, email: saved.email, role: saved.role, tokenBalance: saved.tokenBalance, authProvider: saved.authProvider, createdAt: saved.createdAt, lastLogin: saved.lastLogin }
    res.status(201).json(userResponse)
  } catch (err) {
    console.error('Error creating user:', err)
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: 'Failed to create user', details: err.message })
  }
}

const updateUser = async (req, res) => {
  try {
    const { fullName, courseYear, role, password } = req.body
    const updates = {}
    if (fullName) updates.fullName = fullName
    if (courseYear) updates.courseYear = courseYear
    if (role) updates.role = role
    if (password) updates.password = password

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ error: 'User not found' })
    res.json(updated)
  } catch (err) {
    console.error('Error updating user:', err)
    res.status(500).json({ error: 'Failed to update user', details: err.message })
  }
}

const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'User deleted successfully' })
  } catch (err) {
    console.error('Error deleting user:', err)
    res.status(500).json({ error: 'Failed to delete user', details: err.message })
  }
}

const getUserByEmail = async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email)
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    console.error('Error fetching user by email:', err)
    res.status(500).json({ error: 'Failed to fetch user data', details: err.message })
  }
}

module.exports = { getAllUsers, createUser, updateUser, deleteUser, getUserByEmail }
