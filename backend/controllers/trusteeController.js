const Document = require("../models/Document");
const Branch = require("../models/Branch");
const Donation = require("../models/Donation");
const Devotee = require("../models/Devotee");
const Event = require("../models/Event");
const Announcement = require("../models/Announcement");
const Trustee = require("../models/Trustee");
const Annadaan = require("../models/Annadaan");
const AuditLog = require("../models/AuditLog");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");
 // Need User model for trustees

exports.getPublicTrustees = async (req, res) => {
  try {
    const trustees = await Trustee.find().select('-password -__v');
    res.status(200).json({ success: true, trustees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalBranches = await Branch.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const totalDevotees = await Devotee.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAnnouncements = await Announcement.countDocuments();
    const totalTrustMembers = await Trustee.countDocuments();
    const totalAnnadanRecords = await Annadaan.countDocuments();

    // Trust level donations
    const donations = await Donation.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalDonations = donations.length > 0 ? donations[0].total : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalBranches,
        totalDocuments,
        totalDevotees,
        totalEvents,
        totalAnnouncements,
        totalTrustMembers,
        totalAnnadanRecords,
        totalDonations
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPendingCounts = async (req, res) => {
  try {
    const pendingAnnadaan = await Annadaan.countDocuments({ status: "pending" });
    const pendingDocuments = await Document.countDocuments({ status: "Pending" });
    const pendingDeletions = await Document.countDocuments({ deleteRequested: true, deleteStatus: "Pending" });
    
    // Add logic for pending announcements if needed (e.g., status: "Draft" or similar)
    // For now, returning the 3 main ones.
    
    res.status(200).json({
      success: true,
      counts: {
        annadaan: pendingAnnadaan,
        documents: pendingDocuments,
        deletions: pendingDeletions,
        total: pendingAnnadaan + pendingDocuments + pendingDeletions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllDocuments = async (req, res) => {
  try {
    const docs = await Document.find()
      .populate("uploadedBy", "username")
      .populate("branch", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ status: "Pending" })
      .populate("uploadedBy", "username")
      .populate("branch", "name");
    res.status(200).json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reviewDocument = async (req, res) => {
  try {
    const { status, reviewComment } = req.body;
    
    if (!["Approved", "Rejected", "Under Review"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    doc.status = status;
    doc.reviewComment = reviewComment || "";
    doc.reviewedBy = req.user._id;

    await doc.save();

    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDeletionRequests = async (req, res) => {
  try {
    const docs = await Document.find({ deleteRequested: true, deleteStatus: "Pending" })
      .populate("uploadedBy", "username")
      .populate("branch", "name");
    res.status(200).json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reviewDeletionRequest = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (status === "Approved") {
      // Check if this user already approved
      const alreadyApproved = doc.deletionApprovals.some(
        (approval) => approval.user.toString() === req.user._id.toString()
      );
      if (!alreadyApproved) {
        doc.deletionApprovals.push({
          user: req.user._id,
          role: 'Trustee'
        });
      }

      // Check thresholds: at least 1 document_admin and 1 Trustee
      const hasAdminApproval = doc.deletionApprovals.some(a => a.role === 'document_admin');
      const hasTrusteeApproval = doc.deletionApprovals.some(a => a.role === 'Trustee');

      if (hasAdminApproval && hasTrusteeApproval) {
        const publicId = doc.cloudinaryPublicId || extractPublicId(doc.pdfUrl);
        if (publicId) {
          await deleteFromCloudinary(publicId, "raw");
          await deleteFromCloudinary(publicId, "image");
        }
        await doc.deleteOne();
        return res.status(200).json({ success: true, message: "Deletion request fully approved and document deleted" });
      } else {
        await doc.save();
        return res.status(200).json({ success: true, message: "Approval recorded. Waiting for Document Handler approval." });
      }
    } else {
      doc.deleteStatus = status;
      doc.deleteRequested = false; // Reset request if rejected so they can request again if needed
      await doc.save();
      return res.status(200).json({ success: true, data: doc, message: `Deletion request ${status}` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, mobile, password } = req.body;
    const trustee = await Trustee.findById(req.user._id);

    if (!trustee) {
      return res.status(404).json({ success: false, message: "Trustee not found" });
    }

    if (name) trustee.name = name;
    if (mobile) trustee.mobile = mobile;
    const file = req.file || (req.files && (req.files.profilePhoto?.[0] || req.files.profileImage?.[0]));
    if (file) {
      const oldPublicId = trustee.profilePhotoPublicId || extractPublicId(trustee.profilePhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
      const uploadRes = await uploadToCloudinary(file, "profiles", { resourceType: "image" });
      if (uploadRes) {
        trustee.profilePhoto = uploadRes.url;
        trustee.profilePhotoPublicId = uploadRes.publicId;
      } else {
        return res.status(400).json({ success: false, message: "Cloudinary upload failed. Please verify Cloudinary configuration." });
      }
    }
    if (password) trustee.password = password;

    await trustee.save();

    const userResponse = trustee.toObject();
    delete userResponse.password;

    res.status(200).json({ success: true, message: "Profile updated successfully", data: userResponse });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getAllAdmins = async (req, res) => { try { const admins = await require('../models/Admin').find().select('-password'); res.json({ success: true, data: admins }); } catch (err) { res.status(500).json({ success: false }); } };

exports.getBranchManagers = async (req, res) => {
  try {
    const managers = await require('../models/BranchManager').find().select('-password');
    res.json({ success: true, data: managers });
  } catch (err) { res.status(500).json({ success: false }); }
};

exports.getDocumentAdmins = async (req, res) => {
  try {
    const admins = await require('../models/DocumentAdmin').find().select('-password');
    res.json({ success: true, data: admins });
  } catch (err) { res.status(500).json({ success: false }); }
};

exports.getAccountants = async (req, res) => {
  try {
    const accs = await require('../models/Accountant').find().select('-password');
    res.json({ success: true, data: accs });
  } catch (err) { res.status(500).json({ success: false }); }
};

exports.getRecentLogins = async (req, res) => {
  try {
    const logins = await AuditLog.find({ userId: req.user._id, action: 'Login' })
      .sort({ timestamp: -1 })
      .limit(10);
    res.status(200).json({ success: true, logins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const documentRequestController = require("./documentRequestController");
exports.getDocumentRequests = documentRequestController.getDocumentRequests;
exports.processDocumentRequest = documentRequestController.processDocumentRequest;
