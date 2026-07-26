const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'News title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },
  fullDescription: {
    type: String,
    required: [true, 'Full description is required']
  },
  coverImage: {
    type: String,
    required: [true, 'Cover image is required']
  },
  coverImagePublicId: {
    type: String,
    default: ''
  },
  galleryImages: [{
    type: String
  }],
  galleryImagesPublicIds: [{
    type: String
  }],
  videoFile: {
    type: String
  },
  videoFilePublicId: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['News', 'Announcement', 'Event', 'Featured'],
    default: 'News'
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  branchSelection: {
    type: String,
    required: [true, 'Branch selection option is required'],
    enum: ['All Branches', 'Specific Branch'],
    default: 'All Branches'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false
  },
  showOnSlider: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  publishDate: {
    type: Date,
    required: [true, 'Publish date is required'],
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Trustee', 'BranchManager']
  }
}, { timestamps: true });

module.exports = mongoose.model("News", newsSchema);
