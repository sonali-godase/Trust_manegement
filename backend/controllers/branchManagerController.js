const Donation = require("../models/Donation");
const Event = require("../models/Event");
const Document = require("../models/Document");
const BranchManager = require("../models/BranchManager");
const News = require("../models/News");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, mobile, password, currentPassword, newPassword, address } = req.body;
    const targetNewPassword = newPassword || password;
    
    const manager = await BranchManager.findById(req.user._id);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Branch Manager not found" });
    }

    if (targetNewPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required to change password." });
      }
      const isMatch = await manager.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Incorrect current password." });
      }
      if (targetNewPassword.length < 6) {
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
      }
      manager.password = targetNewPassword;
    }

    if (name !== undefined) manager.name = name;
    if (email !== undefined) manager.email = email;
    if (mobile !== undefined) manager.mobile = mobile;
    if (address !== undefined) manager.address = address;

    const file = req.file || (req.files && (req.files.profilePhoto?.[0] || req.files.profileImage?.[0]));
    if (file) {
      const oldPublicId = manager.profilePhotoPublicId || extractPublicId(manager.profilePhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
      const uploadRes = await uploadToCloudinary(file, "profiles", { resourceType: "image" });
      if (uploadRes) {
        manager.profilePhoto = uploadRes.url;
        manager.profilePhotoPublicId = uploadRes.publicId;
      } else {
        return res.status(400).json({ success: false, message: "Cloudinary upload failed. Please verify Cloudinary configuration." });
      }
    }

    await manager.save();

    const userResponse = manager.toObject();
    delete userResponse.password;
    userResponse.role = manager.role || 'BranchManager';

    res.status(200).json({ success: true, message: "Profile updated successfully", user: userResponse, data: userResponse });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const branchId = req.user.branch;

    const totalEvents = await Event.countDocuments({ branch: branchId });
    const pendingDocuments = await Document.countDocuments({ branch: branchId, status: "Pending" });
    
    const donations = await Donation.aggregate([
      { $match: { branchId: branchId, status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalDonations = donations.length > 0 ? donations[0].total : 0;

    const totalNews = await News.countDocuments({
      $or: [
        { branch: branchId },
        { branchSelection: 'All Branches' }
      ]
    });

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        pendingDocuments,
        totalDonations,
        totalNews
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ branchId: req.user.branch }).sort("-createdAt");
    res.status(200).json({ success: true, data: donations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchEvents = async (req, res) => {
  try {
    const events = await Event.find({ branch: req.user.branch }).sort("-eventDate");
    res.status(200).json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ branch: req.user.branch }).populate("branch", "name").sort("-createdAt");
    res.status(200).json({ success: true, data: documents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyPassword = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "Current password is required." });
    }
    const manager = await BranchManager.findById(req.user._id || req.user.id);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Branch Manager not found." });
    }
    const isMatch = await manager.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid current password." });
    }
    return res.status(200).json({ success: true, message: "Current password verified successfully." });
  } catch (err) {
    console.error("[branchManagerController][ERROR] verifyPassword:", err.message);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};
