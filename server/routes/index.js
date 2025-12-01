const express = require('express')
const router = express.Router()
const { upload } = require('../middleware/upload')

router.get('/', (req, res) => res.send('PrintDesk API running with user authentication + tokens + status'))

// Compatibility endpoint: accept multipart/form-data with files
router.post('/submit', upload.array('documents', 20), require('../controllers/requestsController').submitRequest)

router.use('/users', require('./users'))
router.use('/requests', require('./requests'))
router.use('/', require('./auth'))
router.use('/', require('./tokens'))

module.exports = router
