const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  adminLoginPin: {
    type: String,
    required: true,
    default: 'log1008'
  },
  cloudinaryCloudName: {
    type: String,
    default: ''
  },
  cloudinaryApiKey: {
    type: String,
    default: ''
  },
  cloudinaryApiSecret: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

