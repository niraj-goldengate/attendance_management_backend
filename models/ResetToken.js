// server/models/ResetToken.js
const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:      { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  used:       { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ResetToken', resetTokenSchema);
