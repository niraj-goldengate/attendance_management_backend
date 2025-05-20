// server/controllers/invitationController.js
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Create a nodemailer transporter using your SMTP settings.
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: false, // use TLS
  auth: {
    user: process.env.MAIL_USERNAME, // e.g., "niraj.goldengate@gmail.com"
    pass: process.env.MAIL_PASSWORD  // your app password
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

exports.sendInvitation = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required.' });
    }
    // Prevent sending an invitation if the user already exists.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(422).json({ message: 'A user with this email already exists.' });
    }

    // Remove any pending invitation for this email.
    await Invitation.deleteMany({ email, status: 'pending' });

    // Generate a token and create a new invitation (expires in 5 minutes).
    const token = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    const invitation = await Invitation.create({
      email,
      token,
      role,
      status: 'pending',
      expires_at,
      approved_at: null
    });

    // Prepare the registration URL (adjust FRONTEND_URL in your .env if needed)
    const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register-invite/${token}`;

    // Send the email invitation.
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'Lead Management'}" <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}>`,
      to: email,
      subject: 'Your Registration Invitation',
      html: `<p>Please click the link below to register:</p><a href="${registrationUrl}">${registrationUrl}</a>`
    });

    return res.json({
      message: 'Invitation sent successfully!',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        role_text: invitation.role == 1 ? 'Sales' : invitation.role == 2 ? 'Marketing' : 'Developer',
        token: invitation.token,
        expires_at: Math.floor(invitation.expires_at.getTime() / 1000),
        registration_url: registrationUrl
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to send invitation email.' });
  }
};


exports.getInvitationByToken = async (req, res) => {
    const token = req.params.token;
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found or expired.' });
    }
    if (invitation.isExpired()) {
      return res.status(403).json({ message: 'Invitation expired.' });
    }
    res.json({
      email: invitation.email,
      token: invitation.token,
      role: invitation.role // 1, 2, or 3
    });
  };

exports.cancelInvitation = async (req, res) => {
    const { invitation_id } = req.body;
    if (!invitation_id) {
      return res.status(400).json({ message: 'Invitation ID is required.' });
    }
    const inv = await Invitation.findByIdAndDelete(invitation_id);
    if (!inv) return res.status(404).json({ message: 'Invitation not found.' });
    return res.json({ message: 'Invitation canceled successfully!' });
  };

exports.getInvitations = async (req, res) => {
  // Optionally, delete expired pending invitations.
  await Invitation.deleteMany({ status: 'pending', expires_at: { $lt: new Date() } });
  const invitations = await Invitation.find({}).sort({ createdAt: -1 });
  return res.json(invitations);
};

// (You can add additional methods for approving an invitation when a user registers.)
