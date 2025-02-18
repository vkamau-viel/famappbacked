const cloudinary = require('cloudinary').v2;
const path = require('path');

// Function to upload image to Cloudinary
exports.uploadProfileImage = async (imagePath) => {
    try {
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
