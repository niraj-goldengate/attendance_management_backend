const express = require('express');
const router  = express.Router();
const Attendance = require('../models/Attendance');
const User       = require('../models/User');
const authMiddleware = require('../middleware/auth');

const getToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

// compare only IP against User.mainIP
async function appendNote(att, user, ip, action) {
  let note = '';
  if (user.mainIP !== ip) {
    
    console.log(ip);
    console.log(user.mainIP);
    
    note = `${action} using a different Device.`;
  }
  if (note) att.notes.push(note);
}


router.post('/signin', authMiddleware, async (req, res) => {
  try {
    
    const { deviceInfo, currentIP: ip ,  fingerprintId} = req.body;
    const userId = req.user.id;
    const today  = getToday();
    

    const user = await User.findById(userId);
    console.log('test :'+ fingerprintId);
    const fingerprintId2=fingerprintId;
    console.log('test2 :'+user.fingerprintId);
    
    
    let att  = await Attendance.findOne({ user: userId, date: today });

    const shouldAppendNote = user.fingerprintId !== fingerprintId2 ;
      
    if (att?.signInTime && !att.signOutTime) {
      return res.status(400).json({ message:'Already signed in today.' });
    }

    // reset after sign out
    if (att?.signInTime && att.signOutTime) {
        if (shouldAppendNote) {
          console.log(shouldAppendNote);
          await appendNote(att, user, ip, 'Sign‑in');
        }
      att.signInTime = new Date();
      att.signOutTime = undefined;
      att.breakIntervals = [];
      att.status = 'online';
      att.autoSignOut = false;
      await att.save();
      return res.json({ message:'Signed in (reset).', attendance: att });
    }

    // new record
    if (!att) {
      att = new Attendance({
        user: userId,
        date: today,
        signInTime: new Date(),
        status: 'online',
        mainIP: user.mainIP,
        mainDevice: user.mainDevice
      });
     
      if (shouldAppendNote) {
        console.log(shouldAppendNote +'hollla');
        
        await appendNote(att, user, ip, 'Sign‑in');
      }

      await att.save();
      return res.json({ message:'Signed in successfully.', attendance: att });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message:'Error during sign in.' });
  }
});

router.post('/signout', authMiddleware, async (req, res) => {
  try {
    const { deviceInfo, currentIP: ip , fingerprintId } = req.body;
    const userId = req.user.id;
    const today  = getToday();
    const fingerprintId2=fingerprintId;

    const user = await User.findById(userId);
    const att  = await Attendance.findOne({ user: userId, date: today });

    const shouldAppendNote = user.fingerprintId !== fingerprintId2 ;

    if (!att?.signInTime) {
      return res.status(400).json({ message:'Not signed in today.' });
    }
    if (att.status === 'break') {
      return res.status(400).json({ message:'Please break out first.' });
    }

    att.signOutTime = new Date();
    att.status      = 'offline';

        
        
        if (shouldAppendNote) {
    await appendNote(att, user, ip, 'Sign‑out');
            }
             await att.save();
    res.json({ message:'Signed out successfully.', attendance: att });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message:'Error during sign out.' });
  }
});

router.post('/breakin', authMiddleware, async (req, res) => {
  try {
    const { deviceInfo, currentIP: ip , fingerprintId } = req.body;
    const userId = req.user.id;
    const today  = getToday();
     const fingerprintId2=fingerprintId;

    const user = await User.findById(userId);
    const att  = await Attendance.findOne({ user: userId, date: today });
    const shouldAppendNote = user.fingerprintId !== fingerprintId2 ;


    if (!att?.signInTime) {
      return res.status(400).json({ message:'Not signed in today.' });
    }
    if (att.status === 'break') {
      return res.status(400).json({ message:'Already on break.' });
    }

    att.breakIntervals.push({ breakIn: new Date() });
    att.status = 'break';

  if (shouldAppendNote) {
    await appendNote(att, user, ip, 'Break‑in');
  }
    await att.save();
    res.json({ message:'Break started.', attendance: att });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message:'Error during break in.' });
  }
});

router.post('/breakout', authMiddleware, async (req, res) => {
  try {
    const { deviceInfo, currentIP: ip , fingerprintId} = req.body;
    const userId = req.user.id;
    const today  = getToday();
    const fingerprintId2=fingerprintId;

    const user = await User.findById(userId);
    const att  = await Attendance.findOne({ user: userId, date: today });
    const shouldAppendNote = user.fingerprintId !== fingerprintId2 ;
    
    if (!att?.signInTime) {
      return res.status(400).json({ message:'Not signed in today.' });
    }
    if (att.status !== 'break') {
      return res.status(400).json({ message:'Not on break.' });
    }

    const last = att.breakIntervals[att.breakIntervals.length - 1];
    if (!last || last.breakOut) {
      return res.status(400).json({ message:'Break not started properly.' });
    }

    last.breakOut = new Date();
    att.status    = 'online';
      if (shouldAppendNote) {
    await appendNote(att, user, ip, 'Break‑out');
      }
    await att.save();
    res.json({ message:'Break ended.', attendance: att });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message:'Error during break out.' });
  }
});



router.get('/today', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today  = getToday();
    let att = await Attendance.findOne({ user: userId, date: today });

    // auto sign‑out after 10h
    if (att?.signInTime && !att.signOutTime) {
      const diff = Date.now() - new Date(att.signInTime).getTime();
      if (diff > 10*3600*1000) {
        att.signOutTime = new Date();
        att.status      = 'offline';
        att.autoSignOut = true;
        att.notes.push('Automatically signed out after 10h inactivity.');
        await att.save();
      }
    }

    res.json({ attendance: att });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message:'Error fetching today attendance.' });
  }
});



// GET attendance report

// routes/attendance.js
router.get('/report', /* auth & admin check */ async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lt: endDate }
    }).populate('user', 'name');

    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});




module.exports = router;
