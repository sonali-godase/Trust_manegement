const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

/**
 * Uploads a local file to Cloudinary under a specified folder.
 * @param {string} filePath - Path of the file on disk.
 * @param {string} folder - Target Cloudinary folder (e.g., 'profiles', 'documents').
 * @param {Object} options - Additional options (resourceType, unlinkAfterUpload, etc.)
 * @returns {Promise<{ url: string, publicId: string } | null>}
 */
const uploadToCloudinary = async (filePath, folder = "uploads", options = {}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const {
    resourceType = "auto",
    unlinkAfterUpload = true
  } = options;

  try {
    const cloudinaryInstance = await cloudinary.getCloudinary();
    if (!cloudinaryInstance) {
      console.warn("Cloudinary is not configured properly. Skipping Cloudinary upload.");
      return null;
    }

    const uploadOptions = {
      folder: folder,
      resource_type: resourceType
    };

    const result = await cloudinaryInstance.uploader.upload(filePath, uploadOptions);

    if (unlinkAfterUpload && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete temp file after Cloudinary upload:", err.message);
      }
    }

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    // Return null on failure so callers can safely fallback to local storage path
    return null;
  }
};

/**
 * Deletes an asset from Cloudinary using its public_id.
 * @param {string} publicId - The Cloudinary public ID of the asset.
 * @param {string} resourceType - Resource type ('image', 'video', 'raw'). Default 'image'.
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;

  try {
    const cloudinaryInstance = await cloudinary.getCloudinary();
    if (!cloudinaryInstance) return;

    // Try primary resourceType, fallback if raw/video vs image
    await cloudinaryInstance.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset (${publicId}):`, error.message);
  }
};

/**
 * Extracts publicId from a Cloudinary URL if available.
 * @param {string} url 
 * @returns {string|null}
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return null;
  }
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    // Remove version if present (v12345678)
    const rest = parts.slice(uploadIndex + 1);
    if (rest[0] && /^v\d+$/.test(rest[0])) {
      rest.shift();
    }
    const fullPathWithExt = rest.join("/");
    const lastDotIndex = fullPathWithExt.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      return fullPathWithExt.substring(0, lastDotIndex);
    }
    return fullPathWithExt;
  } catch (e) {
    return null;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId
};
