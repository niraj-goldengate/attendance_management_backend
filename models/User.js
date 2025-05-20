// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'user' },

    // IP and device fields
    mainIP: { type: String },         // e.g., IPv6
    mainIP_ipv4: { type: String },    // e.g., IPv4
    mainDevice: { type: String },      // Captured from user-agent
    fingerprintId:{ type: String },      // <— new
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
