const express = require('express')
const router = express.Router()
const usersController = require('../controllers/usersController')

router.get('/', usersController.getAllUsers)
// Notifications endpoint (must appear before the generic ':email' route)
router.get('/:email/notifications', usersController.getNotificationsByEmail)
router.post('/', usersController.createUser)
router.patch('/:id', usersController.updateUser)
router.delete('/:id', usersController.deleteUser)
router.get('/:email', usersController.getUserByEmail)
// Mark notification as read
router.patch('/:id/notifications/:nid/read', usersController.markNotificationRead)

module.exports = router
