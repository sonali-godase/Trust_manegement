const Gallery = require("../models/Gallery");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

// Get all gallery items
exports.getGalleryItems = async (req, res) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a gallery item
exports.createGalleryItem = async (req, res) => {
  try {
    const { title, type, category } = req.body;
    let url = req.body.url;
    let publicId = "";

    if (req.file) {
      const isVideo = type === "video" || req.file.mimetype.startsWith("video/");
      const folder = isVideo ? "gallery/videos" : "gallery/images";
      const resourceType = isVideo ? "video" : "image";
      const uploadRes = await uploadToCloudinary(req.file.path, folder, { resourceType });
      if (uploadRes) {
        url = uploadRes.url;
        publicId = uploadRes.publicId;
      }
    }

    if (!url) {
      return res.status(400).json({ success: false, message: "Please provide a URL or upload a file" });
    }

    const newItem = await Gallery.create({ title, url, publicId, type, category });
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a gallery item
exports.updateGalleryItem = async (req, res) => {
  try {
    const { title, type, category } = req.body;
    let url = req.body.url;
    let publicId = "";

    const existingItem = await Gallery.findById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({ success: false, message: "Gallery item not found" });
    }

    if (req.file) {
      const oldPid = existingItem.publicId || extractPublicId(existingItem.url);
      if (oldPid) {
        const oldResType = existingItem.type === "video" ? "video" : "image";
        await deleteFromCloudinary(oldPid, oldResType);
      }

      const isVideo = type === "video" || req.file.mimetype.startsWith("video/");
      const folder = isVideo ? "gallery/videos" : "gallery/images";
      const resourceType = isVideo ? "video" : "image";
      const uploadRes = await uploadToCloudinary(req.file.path, folder, { resourceType });
      if (uploadRes) {
        url = uploadRes.url;
        publicId = uploadRes.publicId;
      }
    }

    const updateData = { title, type, category };
    if (url) updateData.url = url;
    if (publicId) updateData.publicId = publicId;

    const item = await Gallery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a gallery item
exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Gallery item not found" });
    }

    const pid = item.publicId || extractPublicId(item.url);
    if (pid) {
      const resType = item.type === "video" ? "video" : "image";
      await deleteFromCloudinary(pid, resType);
    }

    await Gallery.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Gallery item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
