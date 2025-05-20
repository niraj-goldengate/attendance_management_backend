// server/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: Date, required: true },            // today (time zeroed)
  signInTime:  { type: Date },
  signOutTime: { type: Date },
  breakIntervals: [
    {
      breakIn:  { type: Date },
      breakOut: { type: Date }
    }
  ],
  status:      { type: String, enum: ['offline','online','break'], default: 'offline' },
  mainIP:      { type: String },                          // stored from user.mainIP
  mainDevice:  { type: String },
  autoSignOut: { type: Boolean, default: false },
  notes:       { type: [String], default: [] }            // <— array of notes
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
