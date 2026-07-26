/**
 * userDashboardController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all user-facing dashboard API operations:
 *   GET  /api/user/profile       → getProfile
 *   PUT  /api/user/profile       → updateProfile
 *   GET  /api/user/my-orders     → getMyOrders (Pooja Bookings)
 *   GET  /api/user/my-donations  → getMyDonations
 *   GET  /api/user/my-annadaan   → getMyAnnadaan
 *
 * All routes require authMiddleware (req.user must be set).
 * Queries by userId first, falls back to email for legacy data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const Donation     = require("../models/Donation");
const Annadaan     = require("../models/Annadaan");
const path         = require("path");
const fs           = require("fs");
const { generateReceiptPdf } = require("../utils/generateReceipt");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");


// ─── Helper: build query that matches by userId OR email ─────────────────────
const buildUserQuery = (user) => {
  const conditions = [];
  if (user._id) conditions.push({ userId: user._id });
  if (user.email) {
    conditions.push({ email: user.email.trim().toLowerCase() });
    // Extra safeguard: add the raw email just in case some old records aren't lowercased
    if (user.email !== user.email.trim().toLowerCase()) {
      conditions.push({ email: user.email });
    }
  }
  
  return conditions.length > 0 ? { $or: conditions } : {};
};

// ─── GET /api/user/profile ───────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  try {
    const Model = req.user.role === 'Devotee' ? require("../models/Devotee") : null;
    if (!Model) return res.status(403).json({ success: false, message: "Forbidden" });
    const user = await Model.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("[userDashboard][ERROR] getProfile:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
};

// ─── PUT /api/user/profile ───────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const Model = req.user.role === 'Devotee' ? require("../models/Devotee") : null;
    if (!Model) return res.status(403).json({ success: false, message: "Forbidden" });
    const { name, email, mobile } = req.body;
    const updateData = {};

    if (name && name.trim()) updateData.name = name.trim();
    if (mobile && mobile.trim()) updateData.mobile = mobile.trim();

    // Email change — check for duplicates
    if (email && email.trim() && email.trim() !== req.user.email) {
      const existing = await Model.findOne({ email: email.trim().toLowerCase() });
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ success: false, message: "Email is already in use." });
      }
      updateData.email = email.trim().toLowerCase();
    }

    // Handle profile photo upload (multer file)
    const file = req.file || (req.files && (req.files.profilePhoto?.[0] || req.files.profileImage?.[0]));
    if (file) {
      const currentUser = await Model.findById(req.user._id);
      const oldPublicId = currentUser?.profilePhotoPublicId || extractPublicId(currentUser?.profilePhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }

      const uploadRes = await uploadToCloudinary(file, "profiles", { resourceType: "image" });
      if (uploadRes) {
        updateData.profilePhoto = uploadRes.url;
        updateData.profilePhotoPublicId = uploadRes.publicId;
      } else {
        return res.status(400).json({ success: false, message: "Cloudinary upload failed. Please verify Cloudinary configuration." });
      }
    }

    const currentUser = await Model.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    Object.assign(currentUser, updateData);
    await currentUser.save();

    const updatedUser = currentUser.toObject();
    delete updatedUser.password;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (err) {
    console.error("[userDashboard][ERROR] updateProfile:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to update profile." });
  }
};


// ─── GET /api/user/my-donations ──────────────────────────────────────────────

exports.getMyDonations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = buildUserQuery(req.user);

    if (!query.$or) {
      return res.status(200).json({ success: true, data: [], total: 0, totalAmount: 0, page: 1, totalPages: 0 });
    }

    if (status && status !== "All") {
      query.$or = query.$or.map(cond => ({ ...cond, status }));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Donation.countDocuments(query);
    const donations = await Donation.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate total donation amount
    const allDonations = await Donation.find(query).select("amount");
    const totalAmount = allDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

    return res.status(200).json({
      success: true,
      data: donations,
      total,
      totalAmount,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("[userDashboard][ERROR] getMyDonations:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch donations." });
  }
};

// ─── GET /api/user/my-annadaan ───────────────────────────────────────────────

exports.getMyAnnadaan = async (req, res) => {
  try {
    const query = buildUserQuery(req.user);

    if (!query.$or) {
      return res.status(200).json({ success: true, data: [], total: 0 });
    }

    const annadaans = await Annadaan.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: annadaans,
      total: annadaans.length,
    });
  } catch (err) {
    console.error("[userDashboard][ERROR] getMyAnnadaan:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch annadaan records." });
  }
};

// ─── GET /api/user/dashboard-stats ───────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const query = buildUserQuery(req.user);

    if (!query.$or) {
      return res.status(200).json({
        success: true,
        data: { totalOrders: 0, totalDonations: 0, totalDonationAmount: 0, totalAnnadaan: 0 },
      });
    }

    const [totalDonations, totalAnnadaan, donationAmounts] = await Promise.all([
      Donation.countDocuments(query),
      Annadaan.countDocuments(query),
      Donation.find(query).select("amount"),
    ]);

    const totalDonationAmount = donationAmounts.reduce((sum, d) => sum + (d.amount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalOrders: 0,
        totalDonations,
        totalDonationAmount,
        totalAnnadaan,
      },
    });
  } catch (err) {
    console.error("[userDashboard][ERROR] getDashboardStats:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats." });
  }
};

// ─── GET /api/user/my-donations/:id/receipt ───────────────────────────────────

exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation record not found." });
    }

    // Verify ownership: must be the user's donation (by userId, email, or name)
    const isOwner = 
      (donation.userId && donation.userId.toString() === req.user._id.toString()) ||
      (donation.email && req.user.email && donation.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (donation.donorName && req.user.name && donation.donorName.toLowerCase() === req.user.name.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized to access this receipt." });
    }

    const pdfBuffer = await generateReceiptPdf(donation.toObject());

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[userDashboard][ERROR] downloadReceipt:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate receipt PDF." });
  }
};

// ─── GET /api/user/my-annadaan/:id/receipt ───────────────────────────────────

exports.downloadAnnadaanReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const annadaan = await Annadaan.findById(id);

    if (!annadaan) {
      return res.status(404).json({ success: false, message: "Annadaan record not found." });
    }

    if (annadaan.status !== "approved" && annadaan.status !== "completed") {
      return res.status(400).json({ success: false, message: "Receipt is only available after approval." });
    }

    // Verify ownership: must be the user's annadaan (by userId, email, or name)
    const isOwner = 
      (annadaan.userId && annadaan.userId.toString() === req.user._id.toString()) ||
      (annadaan.email && req.user.email && annadaan.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (annadaan.name && req.user.name && annadaan.name.toLowerCase() === req.user.name.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized to access this receipt." });
    }

    const pdfBuffer = await generateReceiptPdf({
      ...annadaan.toObject(),
      donorName: annadaan.name,
      amount: "Annadaan Seva",
      message: `Annadaan - ${annadaan.annadaanType}`,
      utrNumber: "",
      paymentApp: "N/A",
      receiptNumber: `ANN-${id.substring(0, 8).toUpperCase()}`,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=annadaan_receipt_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[userDashboard][ERROR] downloadAnnadaanReceipt:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate receipt PDF." });
  }
};

// ─── DELETE /api/user/my-annadaan/:id ──────────────────────────────────────────

exports.cancelAnnadaan = async (req, res) => {
  try {
    const { id } = req.params;
    const annadaan = await Annadaan.findById(id);

    if (!annadaan) {
      return res.status(404).json({ success: false, message: "Annadaan record not found." });
    }

    // Verify ownership
    const isOwner = 
      (annadaan.userId && annadaan.userId.toString() === req.user._id.toString()) ||
      (annadaan.email && req.user.email && annadaan.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (annadaan.name && req.user.name && annadaan.name.toLowerCase() === req.user.name.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized to cancel this seva." });
    }

    await Annadaan.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Annadaan Seva cancelled and removed successfully." });
  } catch (err) {
    console.error("[userDashboard][ERROR] cancelAnnadaan:", err.message);
    return res.status(500).json({ success: false, message: "Failed to cancel Annadaan Seva." });
  }
};
