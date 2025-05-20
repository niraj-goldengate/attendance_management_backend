// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const invitationRoutes = require('./routes/invitations');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');  
const adminRoutes = require('./routes/admin');


const app = express();

// Middleware
app.use(express.json());
app.use(cors());


// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/invitations', invitationRoutes);

app.use('/api/users', userRoutes);

app.use('/api/attendance', attendanceRoutes);

app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));


// Health-check route
app.get('/hi-there', (req, res) => {
  const port = process.env.PORT || 5000;
  const host = req.headers.host;
  res.json({
    message: 'Your app is running',
    domain: host,
    port: port
  });
});


