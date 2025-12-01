const User = require('../models/User')

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email, authProvider: 'manual' }).select('+password')
    if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid email or password' })
    user.lastLogin = new Date()
    await user.save()
    res.json({ _id: user._id, fullName: user.fullName, email: user.email, role: user.role, tokenBalance: user.tokenBalance })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed', details: err.message })
  }
}

const googleLogin = async (req, res) => {
  try {
    const { email, fullName, googleId, picture } = req.body
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({ email, fullName, googleId, picture, authProvider: 'google', role: email && email.startsWith('admin@') ? 'admin' : 'student' })
    }
    user.lastLogin = new Date()
    await user.save()
    res.json({ _id: user._id, fullName: user.fullName, email: user.email, role: user.role, picture: user.picture, tokenBalance: user.tokenBalance })
  } catch (err) {
    console.error('Google login error:', err)
    res.status(500).json({ error: 'Google login failed', details: err.message })
  }
}

module.exports = { login, googleLogin }
