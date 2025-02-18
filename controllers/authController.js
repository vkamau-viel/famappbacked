// controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../models');  // Import models from index.js
const { User, Member, Relationship, Family } = models;  // Destructure to get the User model
//const User = require('../models/user');
const { Op } = require('sequelize');
//const cloudinary = require('../config/cloudinaryConfig');
const cloudinary = require('cloudinary').v2;
const uploadProfileImage = require('../configs/cloudinaryConfig');
const upload = require('../configs/cloudinaryConfig'); // Multer configuration
const nodemailer = require('nodemailer'); // For email functionality (password reset)
const { generateAccessToken, generateEmailVerificationToken, generateRefreshToken, generatePasswordResetToken } = require('../utils/generateTokens');
//const { User } = require('../models'); // Adjust the path to your models
const { getAuth } = require("firebase-admin/auth");
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password or app password
  },
});

// get stats
exports.getStats = async (req, res) => {
  try {
    const usersCount = await User.count();
    const membersCount = await Member.count();
    const familiesCount = await Family.count();
    const relationshipsCount = await Relationship.count();

    return res.status(200).json({
      users: usersCount,
      members: membersCount,
      families: familiesCount,
      relationships: relationshipsCount,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
// Register User
exports.register = async (req, res) => {
  const { userName, email, password } = req.body;
  console.log(User); 

  try {
    // Check if user already exists
    const userExists = await User.findOne({ where: { email:email } });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Create user
    const newUser = await User.create({
      userName,
      email,
      password: hashedPassword,
      verificationCode,
      isEmailVerified: false,
    });

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      html: `<p>Hello ${userName},</p>
             <p>Your verification code is: </p>
             <p><strong>${verificationCode}</strong></p>
             <p>Enter this code in the app to verify your account.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'User registered. Check your email for the verification code.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user.' });
  }
};

// Verify Email
exports.verifyUser = async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'User already verified.' });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.verificationCode = null; // Clear the verification code
    await user.save();

    res.status(200).json({ message: 'User verified successfully.' });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ message: 'Error verifying user.' });
  }
};

// Resend Verification Code
exports.resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'User already verified.' });
    }

    // Generate new verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    user.verificationCode = verificationCode;
    await user.save();

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Resend Verification Code',
      html: `<p>Hello ${user.userName},</p>
             <p>Your new verification code is: </p>
             <p><strong>${verificationCode}</strong></p>
             <p>Enter this code in the app to verify your account.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Verification code resent.' });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ message: 'Error resending verification code.' });
  }
};



//chcke if email is verified
exports.checkEmailVerified = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id); // Assuming `req.user` is populated by JWT middleware
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.isEmailVerified) {
            return res.status(403).json({ error: 'Email not verified. Please verify your email to continue.' });
        }

        next(); // Proceed if email is verified
    } catch (err) {
        console.error('Error checking email verification:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Login a user and generate JWT token
let refreshTokens = [];

// Login User
exports.login = async (req, res) => {
    const { email, password } = req.body;
  
    try {
        console.log('Request Body:', req.body);
        const user = await User.findOne({ where: {email: email} });
        console.log('User found:', user);
      
        if (!user) {
          console.error('User not found');
          return res.status(404).json({ error: 'User not found' });
        }
      
        if (!user.isEmailVerified) {
          console.warn('Email not verified');
          return res.status(201).json({ message: 'Email is not verified.' });
        }
      
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password validation:', isPasswordValid);
        if (!isPasswordValid) {
          console.error('Invalid credentials');
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        const usersName = user.userName;
        console.log('access token:', accessToken);
        console.log('refresh token:', refreshToken);
      
        res.json({ accessToken, refreshToken, usersName, user });
      } catch (err) {
        console.error('Error in login:', err);
        res.status(500).json({ error: 'Login failed' });
      }
      
  };  

// Refresh Token
exports.refreshToken = (req, res) => {
    const { refreshToken } = req.body;
  
    if (!refreshToken || !refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ error: 'Refresh token is invalid' });
    }
  
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const accessToken = generateAccessToken(decoded.id);
      res.json({ accessToken });
    } catch (err) {
      res.status(403).json({ error: 'Refresh token expired' });
    }
  };
  
  // Logout User
  exports.logout = (req, res) => {
    const { refreshToken } = req.body;
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    res.status(200).json({ message: 'Logged out successfully' });
  };

// Forgot password: Send an email with a reset token
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        // Generate reset token        
      const resetToken = generatePasswordResetToken(user.id);
        
        // Save token to user record (set expiry time if needed)
        user.reset_token = resetToken;
        user.reset_token_expiry = Date.now() + 3600000; // 1 hour expiry
        await user.save();
        
        // Send email with reset token (Nodemailer or other email service)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            text: `Here is your password reset token: ${resetToken}`
        };
        
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: 'Password reset token sent' });
    } catch (err) {
        res.status(500).json({ error: 'Error processing password reset' });
    }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
    const { resetToken, newPassword } = req.body;
    try {
        // Find user by reset token
        const user = await User.findOne({ where: { reset_token: resetToken } });
        if (!user || user.reset_token_expiry < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Hash new password and update user record
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.reset_token = null;
        user.reset_token_expiry = null;
        await user.save();
        
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error resetting password' });
    }
};

// Get logged-in user's profile
exports.getUserProfile = async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['userName', 'email', 'phoneNumber', 'profileImage'], // Select necessary fields
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Get User Profile Error:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  };

//upload profile images
// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Update user profile (email, phone, and password)
exports.updateUserProfile = async (req, res) => {
    const { userName, email, phoneNumber, password, profileImage } = req.body;
  
    try {
      const user = await User.findByPk(req.user.id);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update fields if provided
      if (userName) user.userName = userName;
      if (email) user.email = email;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
      }
      if (profileImage) user.profileImage = profileImage; 
  
      await user.save();
  
      res.json({ success: true, message: 'Profile updated successfully', profileImage: user.profileImage });
    } catch (error) {
      console.error('Update User Profile Error:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  };

  exports.uploadProfileImage = async (imagePath) => {
    try {
        const path = require('path');
        const absolutePath = path.resolve(imagePath);
        console.log('Uploading image from path:', absolutePath);

        const result = await cloudinary.uploader.upload(absolutePath, {
            folder: 'famappprofiles',
            resource_type: 'image',
        });

        console.log('Cloudinary upload result:', result);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error('Failed to upload image');
    }
};  


