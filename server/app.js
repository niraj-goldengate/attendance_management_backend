// server/app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const invitationRoutes = require('../server/routes/invitations');
const authRoutes       = require('../server/routes/auth');
const userRoutes       = require('../server/routes/users');
const attendanceRoutes = require('../server/routes/attendance');  
const adminRoutes      = require('../server/routes/admin');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin',      adminRoutes);

// Health-check
app.get('/hi-there', (req, res) => {
  res.json({
    message: 'Your app is running',
    domain:  req.headers.host,
    port:    process.env.PORT || 5000
  });
});

module.exports = app;
