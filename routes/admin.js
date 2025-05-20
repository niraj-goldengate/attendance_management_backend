// server/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Helper: Get today's date with time set to 00:00:00.
const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// GET /api/admin/team
router.get('/team', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const today = getToday();

    // load all users (you may wish to filter out super-admins here)
    const users = await User.find({ role: { $ne: 'admin' } });

    const team = await Promise.all(
      users.map(async (user) => {
        // 1) fetch today's attendance
        const todayRec = await Attendance.findOne({
          user: user._id,
          date: today
        });

        // 2) fetch the most recent signInTime across *all* records
        const lastRec = await Attendance.findOne({
          user: user._id,
          signInTime: { $exists: true }
        })
        .sort({ date: -1 })      // latest date first
        .select('signInTime')    // only need that field
        .lean();

        return {
          id: user._id,
          name: user.name,
          role: user.role,
          // status & today’s signIn
          status: todayRec ? todayRec.status : 'offline',
          todaySignIn: todayRec && todayRec.signInTime
            ? todayRec.signInTime
            : null,
          // most recent ever sign-in
          lastSignIn: lastRec ? lastRec.signInTime : null
        };
      })
    );

    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching team data.' });
  }
});

module.exports = router;
