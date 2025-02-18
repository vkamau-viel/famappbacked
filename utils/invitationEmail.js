// utils/email.js
const nodemailer = require('nodemailer');

// Configure Nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your mail service provider
  auth: {
    user: process.env.EMAIL_USER,  // Your email address
    pass: process.env.EMAIL_PASSWORD,  // Your email password or App-specific password
  },
});

const sendInvitationEmail = (email) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Family Invitation',
    text: 'You have been invited to join a family. Please click the link to accept the invitation.',
    html: '<b>You have been invited to join a family. Please click the link to accept the invitation.</b>',
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendInvitationEmail };
