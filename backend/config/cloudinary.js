const cloudinary = require("cloudinary").v2;
const SystemSettings = require("../models/SystemSettings");

// Initialize statically as fallback/default
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mongoose = require("mongoose");

// Helper function to get dynamically configured cloudinary instance
const getCloudinary = async () => {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let apiKey = process.env.CLOUDINARY_API_KEY;
  let apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (mongoose.connection.readyState === 1) {
    try {
      const settings = await SystemSettings.findOne().maxTimeMS(1000).lean();
      if (settings) {
        if (settings.cloudinaryCloudName) cloudName = settings.cloudinaryCloudName;
        if (settings.cloudinaryApiKey) apiKey = settings.cloudinaryApiKey;
        if (settings.cloudinaryApiSecret) apiSecret = settings.cloudinaryApiSecret;
      }
    } catch (error) {
      console.warn("Dynamic SystemSettings lookup skipped:", error.message);
    }
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  return cloudinary;
};


// Attach helper to the cloudinary object
cloudinary.getCloudinary = getCloudinary;

module.exports = cloudinary;

