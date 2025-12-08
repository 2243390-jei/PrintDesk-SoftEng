const express = require('express')
const router = express.Router()
const tokensController = require('../controllers/tokensController')

router.post('/reset-tokens', tokensController.scheduleReset)
router.post('/cancel-reset', tokensController.cancelReset)
router.get('/reset-tokens/scheduled', tokensController.getScheduled)
router.post('/execute-token-reset', tokensController.executeReset)
router.post('/reset-all', tokensController.resetAllTokens)

module.exports = router