// server/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Invitation = require('../models/Invitation'); // Import Invitation model
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// GET /api/users – list all users
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
});

// PUT /api/users/:id – update user email and role
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.email = email;
    user.role = role;
    await user.save();
    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating user.' });
  }
});

// DELETE /api/users/:id – delete user
// DELETE /api/users/:id – delete user and associated invitation(s)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Delete the user
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      
      // Also remove any invitation document associated with the user's email
      await Invitation.deleteMany({ email: user.email });
      
      res.json({ success: true, message: 'User and associated invitation(s) deleted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error deleting user.' });
    }
  });

module.exports = router;
