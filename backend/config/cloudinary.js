const cloudinary = require("cloudinary").v2;
const SystemSettings = require("../models/SystemSettings");

// Initialize statically as fallback/default
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to get dynamically configured cloudinary instance
const getCloudinary = async () => {
  try {
    const settings = await SystemSettings.findOne();
    const cloudName = (settings && settings.cloudinaryCloudName) || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = (settings && settings.cloudinaryApiKey) || process.env.CLOUDINARY_API_KEY;
    const apiSecret = (settings && settings.cloudinaryApiSecret) || process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return null;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    return cloudinary;
  } catch (error) {
    console.error("Error setting dynamic Cloudinary config:", error.message);
    return null;
  }
};


// Attach helper to the cloudinary object
cloudinary.getCloudinary = getCloudinary;

module.exports = cloudinary;

