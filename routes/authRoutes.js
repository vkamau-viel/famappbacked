// routes/authRoutes.js

const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); // Authentication middleware
const multer = require('multer'); // For handling multipart/form-data
const path = require('path');
const fs = require('fs');
const { updateUserProfile, getUserProfile, uploadProfileImage } = require('../controllers/authController');
//const { checkEmailVerified } = require('../middleware/checkEmailVerified');
//const upload = require('../config/cloudinaryConfig'); // Multer configuration
//const upload = require('../middleware/multerConfig'); // Import Multer configuration
const router = express.Router();

//get stats
router.get('/stats', authController.getStats);
// Register a new user
router.post('/register', authController.register); // Registration endpoint
router.post('/verify', authController.verifyUser); // Email verification endpoint
router.post('/resend-code', authController.resendVerificationCode); // Resend verification code endpoint




//router.post('/register', authController.register);
//router.post('/verify-registration', authController.verifyRegistration);
//router.post('/resend-verification', authController.resendVerification);

// check if email is verified
//router.get('/profile', authMiddleware, checkEmailVerified, authController.getUserProfile);

// Login a user and get JWT token
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Forgot password: send reset token via email
router.post('/forgot-password', authController.forgotPassword);

// Reset password using reset token
router.post('/reset-password', authController.resetPassword);

// Route to get user profile
router.get('/profile', authMiddleware, authController.getUserProfile);

// Route to update user profile
router.put('/profile', authMiddleware, updateUserProfile);

// Set up Multer storage (temporary storage before uploading to Cloudinary)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Temporary storage directory
    },
    filename: (req, file, cb) => {
      // Generate a unique filename
      cb(null, `${Date.now()}_${path.extname(file.originalname)}`);
    },
  });
  
  const upload = multer({ storage });
  
  /**
   * Route to upload profile image
   */
  router.post('/upload-profile-image', upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Check if the file exists
        if (!fs.existsSync(req.file.path)) {
            return res.status(400).json({ error: 'File does not exist' });
        }

        // Upload the image to Cloudinary
        const uploadedImageUrl = await uploadProfileImage(req.file.path);

        // Optionally, delete the file from the server after upload
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });

        res.json({ success: true, profileImage: uploadedImageUrl });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({ error: 'Failed to upload profile image' });
    }
});

// Export routes
module.exports = router;
