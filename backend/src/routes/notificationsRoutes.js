const express = require('express');
const controller = require('../controllers/notificationsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('staff', 'admin'));

router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', controller.markAsRead);

module.exports = router;