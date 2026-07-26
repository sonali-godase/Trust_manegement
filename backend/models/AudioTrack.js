const mongoose = require("mongoose");

const audioTrackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Audio title is required'],
    trim: true,
  },
  audioUrl: {
    type: String,
    required: [true, 'Audio URL is required']
  },
  audioPublicId: {
    type: String,
    default: ''
  },
  thumbnailUrl: {
    type: String,
    default: '',
  },
  thumbnailPublicId: {
    type: String,
    default: ''
  },
  lyricsDataUrl: {
    type: String, // Cloudinary URL to the .vtt or .srt file
  },
  language: {
    type: String,
    enum: ['Marathi', 'Hindi', 'English', 'Kannada', 'Other'],
    default: 'Marathi'
  },
  sourceType: {
    type: String,
    enum: ['youtube', 'direct_upload'],
    default: 'direct_upload'
  },
  originalYoutubeUrl: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trustee',
    required: false
  }
}, { timestamps: true });

// Pre-save to ensure only one active track at a time if this is marked active
audioTrackSchema.pre('save', async function() {
  if (this.isModified('isActive') && this.isActive) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
  }
});

module.exports = mongoose.model("AudioTrack", audioTrackSchema);
