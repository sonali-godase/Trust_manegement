const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  fullDescription: {
    type: String,
    required: [true, 'Full description is required']
  },
  featuredImage: {
    type: String,
    required: [true, 'Featured image is required']
  },
  featuredImagePublicId: {
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
  eventDate: {
    type: Date,
    required: [true, 'Event start date is required']
  },
  eventTime: {
    type: String,
    required: [true, 'Event time is required']
  },
  eventEndDate: {
    type: Date
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  organizerName: {
    type: String,
    default: "Temple Trust"
  },
  organizerContact: {
    type: String
  },

  tags: [{
    type: String,
    trim: true
  }],
  eventType: {
    type: String,
    enum: ['offline', 'online', 'hybrid'],
    default: 'offline'
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  totalViews: {
    type: Number,
    default: 0
  },
  totalVisitors: {
    type: Number,
    default: 0
  },
  registrationEnabled: {
    type: Boolean,
    default: false
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false // Kept false initially to avoid breaking existing data, but UI should force it
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin'
  }
}, { timestamps: true });

// Pre-save hook to generate slug
eventSchema.pre('save', async function() {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
      
    // Add random string to ensure uniqueness if needed, but for now just basic slug
    const randomSuffix = Math.floor(Math.random() * 1000).toString();
    this.slug = `${this.slug}-${randomSuffix}`;
  }
});

module.exports = mongoose.model("Event", eventSchema);
