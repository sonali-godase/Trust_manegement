const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  donationReference: {
    type: String,
    unique: true,
    required: true
  },
  donorName: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: false
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ["PENDING_PAYMENT", "PENDING_VERIFICATION", "APPROVED", "REJECTED"],
    default: "PENDING_PAYMENT"
  },
  utrNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  upiId: {
    type: String,
    required: false
  },
  paymentApp: {
    type: String,
    required: false
  },
  screenshotUrl: {
    type: String,
    required: false
  },
  cloudinaryPublicId: {
    type: String,
    required: false,
    default: ""
  },
  rejectionReason: {
    type: String,
    required: false
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  receiptPdfUrl: {
    type: String,
    required: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'approvedByModel',
    required: false
  },
  approvedByModel: {
    type: String,
    enum: ['Admin', 'BranchManager', 'Trustee', 'Accountant'],
    required: false
  },
  approvalDate: {
    type: Date,
    required: false
  },
  approvalRemarks: {
    type: String,
    required: false
  },
  donationType: {
    type: String,
    enum: ["dengi_pavti", "shakha_pavti", "jama_pavti"],
    default: "dengi_pavti"
  },
  date: {
    type: Date,
    default: Date.now
  },
  lastReceiptDownloadedAt: {
    type: Date,
    required: false
  },
  receiptPublicId: {
    type: String,
    required: false
  },
  receiptGeneratedAt: {
    type: Date,
    required: false
  },
  versionNumber: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model("Donation", donationSchema);
