const express = require('express');
const controller = require('../controllers/complaintsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public — customer-facing (Raise Complaint, Track Complaint Status use cases)
router.post('/', controller.create);
router.get('/track/:reference', controller.trackByReference);

// Staff/admin — internal (Review Complaint, Update Complaint Status, Resolve Complaint use cases)
router.get('/', requireAuth, requireRole('staff', 'admin'), controller.list);
router.get('/:id', requireAuth, requireRole('staff', 'admin'), controller.getById);
router.patch('/:id', requireAuth, requireRole('staff', 'admin'), controller.update);

module.exports = router;
