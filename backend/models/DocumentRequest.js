const mongoose = require("mongoose");

const documentRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ["Create", "Update", "Delete"],
    required: true
  },
  targetDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document"
  },
  documentData: {
    title: { type: String },
    description: { type: String },
    category: { type: String },
    pdfName: { type: String },
    pdfUrl: { type: String },
    cloudinaryPublicId: { type: String, default: "" },
    fileSize: { type: Number },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "requestedByModel"
  },
  requestedByModel: {
    type: String,
    enum: ["DocumentAdmin", "DocumentHandler", "Trustee", "Admin"],
    default: "DocumentAdmin"
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  trusteeRemarks: {
    type: String,
    default: ""
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trustee"
  },
  reviewedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("DocumentRequest", documentRequestSchema);
