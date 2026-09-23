const express = require('express');
const controller = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', controller.getSettings);
router.patch('/', controller.updateSettings);

module.exports = router;
// for admin users to get and update system settings