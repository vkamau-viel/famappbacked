const jwt = require('jsonwebtoken');

// Generate Access Token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '180m' });
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Generate password Reset Token
const generatePasswordResetToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_PASSWORD_SECRET)
}

// Generate email verification token
const generateEmailVerificationToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_EMAIL_VERIFICATION_SECRET, { expiresIn: '1h' });
}

module.exports = { generateAccessToken, generateRefreshToken, generatePasswordResetToken, generateEmailVerificationToken };
