const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  publicId: { type: String, default: "" },
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  category: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Gallery", gallerySchema);
