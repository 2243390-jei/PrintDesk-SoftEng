const notFound = (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
}

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error', details: err.message })
}

module.exports = { notFound, errorHandler }
