// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto  = require('crypto');

const User = require('../models/User');
const Invitation = require('../models/Invitation'); // Import invitation model
const authMiddleware = require('../middleware/auth');
const ResetToken = require('../models/ResetToken');

// (Re‑use your existing transporter from invitationController)
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});


// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Create new user
    user = new User({
      username,
      name,
      email,
      password: await bcrypt.hash(password, 10)
    });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({
      token,
      user: { username: user.username, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
      const { email, password, remember } = req.body; // 'remember' is a boolean
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'user not found' });
  
      // // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      // const isMatch = true;
      if (!isMatch) return res.status(400).json({ message: 'Invalid password' });
  
      // Set token expiration based on "remember" flag
      const expiresIn = remember ? '2d' : '2h';
  
      // Generate token
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn }
      );
  
      res.json({
        token,
        user: { username: user.username, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });
// GET /api/auth/me (Protected route example)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



// POST /api/auth/register-invite
router.post('/register-invite', async (req, res) => {
    try {
      const { name, password, invitation_token ,mainIP, mainIP_ipv4, mainDevice , fingerprintId} = req.body;
      if (!name || !password || !invitation_token) {
        return res.status(400).json({ message: 'Name, password, and invitation token are required.' });
      }
  
      // Find the invitation by token and ensure it's pending
      const invitation = await Invitation.findOne({ token: invitation_token, status: 'pending' });
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or already used.' });
      }
      if (invitation.isExpired()) {
        return res.status(403).json({ message: 'Invitation has expired.' });
      }
  
      // Check if user already exists with this email
      const existingUser = await User.findOne({ email: invitation.email });
      if (existingUser) {
        return res.status(422).json({ message: 'User already registered with this email.' });
      }
  
      // Hash the password and create the new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username: invitation.email, // Or generate a username as needed
        name,
        email: invitation.email,
        password: hashedPassword,
        // Map the invitation role to a string (or leave as number if you prefer)
        role: invitation.role === 1 ? 'sales' : invitation.role === 2 ? 'marketing' : invitation.role === 3 ? 'developer' : 'user',

        mainIP: mainIP_ipv4 || '',
        mainIP_ipv4:  mainIP || '',
        mainDevice: mainDevice || '',
        fingerprintId:   fingerprintId|| ''

      });
      await newUser.save();
  
      // Mark the invitation as approved
      invitation.status = 'approved';
      invitation.approved_at = new Date();
      await invitation.save();
  
      return res.json({ message: 'Registration successful!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error during registration.' });
    }
  });
  


  // POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'User not found.' });

  // delete old tokens
  await ResetToken.deleteMany({ user: user._id });

  // generate new token, expire in 1h
  const token      = crypto.randomBytes(20).toString('hex');
  const expires_at = new Date(Date.now() + 60*60*1000);
  await ResetToken.create({ user: user._id, token, expires_at });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  // send email
  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: user.email,
    subject: 'Password Reset',
    html: `<p>Click to reset your password:</p>
           <a href="${resetUrl}">${resetUrl}</a>
           <p>This link expires in 1 hour.</p>`
  });
  console.log(resetUrl);
  res.json({ message: 'Password reset email sent.' });
});

// GET /api/auth/reset-password/:token
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const rec = await ResetToken.findOne({ token, used: false, expires_at: { $gt: new Date() } });
  if (!rec) return res.status(400).json({ message: 'Invalid or expired token.' });
  const user = await User.findById(rec.user).select('email');
  res.json({ email: user.email });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password, password_confirmation } = req.body;
  if (!token || !password || password !== password_confirmation) {
    return res.status(400).json({ message: 'Invalid input.' });
  }

  const rec = await ResetToken.findOne({ token, used: false, expires_at: { $gt: new Date() } });
  if (!rec) return res.status(400).json({ message: 'Invalid or expired token.' });

  const hash = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(rec.user, { password: hash });
  rec.used = true;
  await rec.save();

  res.json({ message: 'Password has been reset.' });
});




module.exports = router;
