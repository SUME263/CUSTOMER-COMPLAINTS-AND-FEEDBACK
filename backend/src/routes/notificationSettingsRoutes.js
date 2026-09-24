const express = require('express');
const controller = require('../controllers/notificationSettingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('staff', 'admin'));

router.get('/', controller.getSettings);
router.patch('/', controller.updateSettings);

module.exports = router;