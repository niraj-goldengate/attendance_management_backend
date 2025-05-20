// server/routes/invitations.js
const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Only an admin can send, cancel, or list invitations.
router.post('/', authMiddleware, adminMiddleware, invitationController.sendInvitation);
router.post('/cancel', authMiddleware, adminMiddleware, invitationController.cancelInvitation);
router.get('/', authMiddleware, adminMiddleware, invitationController.getInvitations);
router.get('/token/:token', invitationController.getInvitationByToken);

module.exports = router;
