// config/cloudinary.js

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,     // e.g., 'your-cloud-name'
  api_key: process.env.CLOUDINARY_API_KEY,           // e.g., '1234567890abcdef'
  api_secret: process.env.CLOUDINARY_API_SECRET,     // e.g., 'your-api-secret'
});
module.exports = cloudinary;
