const express = require('express')
const router = express.Router()
const requestsController = require('../controllers/requestsController')
const { upload } = require('../middleware/upload')

router.get('/', requestsController.getAllRequests)
router.get('/:id', requestsController.getRequestById)
router.patch('/:id', requestsController.updateRequest)
router.delete('/:id', requestsController.deleteRequest)
router.post('/submit', upload.array('documents', 20), requestsController.submitRequest)

module.exports = router
