const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  pdfName: {
    type: String,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    default: ""
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DocumentAdmin",
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: false
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Under Review"],
    default: "Pending"
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trustee"
  },
  reviewComment: {
    type: String
  },
  deleteRequested: {
    type: Boolean,
    default: false
  },
  deletionReason: {
    type: String
  },
  deleteStatus: {
    type: String,
    enum: ["None", "Pending", "Approved", "Rejected"],
    default: "None"
  },
  deletionApprovals: [{
    user: { type: mongoose.Schema.Types.ObjectId },
    role: { type: String, enum: ['document_admin', 'Trustee'] },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Document", documentSchema);
