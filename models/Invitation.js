// server/models/Invitation.js
const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  role: { type: Number, required: true }, // 1: Sales, 2: Marketing, 3: Developer
  status: { type: String, default: 'pending' }, // pending, approved, canceled
  expires_at: { type: Date, required: true },
  approved_at: { type: Date, default: null }
}, { timestamps: true });

invitationSchema.methods.isExpired = function () {
  return new Date() > this.expires_at;
};

module.exports = mongoose.model('Invitation', invitationSchema);
