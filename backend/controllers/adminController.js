const Admin = require("../models/Admin");
const SystemSettings = require("../models/SystemSettings");
const Trustee = require("../models/Trustee");
const Devotee = require("../models/Devotee");
const BranchManager = require("../models/BranchManager");
const Branch = require("../models/Branch");
const Document = require("../models/Document");
const Donation = require("../models/Donation");
const Event = require("../models/Event");
const Announcement = require("../models/Announcement");
const Annadaan = require("../models/Annadaan");
const sendEmail = require("../utils/sendEmail");
const OTPVerification = require("../models/OTPVerification");
const generateOTP = require("../utils/otpGenerator");
const jwt = require("jsonwebtoken");

// Get Admin Dashboard Stats
exports.getStats = async (req, res) => {
  try {
    const totalTrustees = await Trustee.countDocuments();
    const totalDevotees = await Devotee.countDocuments();
    const totalBranches = await Branch.countDocuments();
    const totalBranchManagers = await BranchManager.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAnnouncements = await Announcement.countDocuments();
    const totalAnnadan = await Annadaan.countDocuments();
    
    // Total Donations
    const donations = await Donation.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalDonations = donations.length > 0 ? donations[0].total : 0;

    const totalDonorsResult = await Donation.countDocuments({ status: 'APPROVED' });
    const uniqueDonorsResult = await Donation.distinct('donorName', { status: 'APPROVED' });
    const totalUniqueDonors = uniqueDonorsResult.length;

    res.status(200).json({
      success: true,
      stats: {
        totalTrustees,
        totalDevotees,
        totalBranches,
        totalBranchManagers,
        totalDocuments,
        totalEvents,
        totalAnnouncements,
        totalAnnadan,
        totalDonations,
        totalDonors: totalDonorsResult,
        totalUniqueDonors
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CRUD for Trustees
exports.getTrustees = async (req, res) => {
  try {
    const trustees = await Trustee.find().select("-password");
    res.status(200).json({ success: true, data: trustees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendTrusteeOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    const existing = await Trustee.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Trustee already exists with this email" });
    
    const otp = generateOTP();
    await OTPVerification.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const message = `Dear ${name},\n\nThis OTP is used for verification and creation of the Trustee role.\n\nYour OTP is: ${otp}\n\nDo not share it.\n\nRegards,\nTrust Management`;
    await sendEmail({ email, subject: "Trustee Verification OTP", message });
    
    res.status(200).json({ success: true, message: "OTP sent successfully to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyTrusteeOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await OTPVerification.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    const verifiedToken = jwt.sign({ email, verified: true }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: '15m' });
    await OTPVerification.deleteMany({ email });

    res.status(200).json({ success: true, message: "Email verified successfully", verifiedToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTrustee = async (req, res) => {
  try {
    let { name, email, mobile, designation, address, password, systemRole, permissions, status, verifiedToken } = req.body;
    
    if (permissions && typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); } catch(e){}
    }
    
    // Verify Token
    try {
      const decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET || "default_secret_key");
      if (decoded.email !== email || !decoded.verified) {
        return res.status(400).json({ success: false, message: "Email verification failed or token mismatch" });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
    }

    let exists = await Trustee.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Trustee email already exists" });

    const trustee = await Trustee.create({ name, email, mobile, designation, address, password, systemRole, permissions, status });
    
    const response = trustee.toObject();
    delete response.password;
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTrustee = async (req, res) => {
  try {
    let { name, email, mobile, designation, address, password, systemRole, permissions, status } = req.body;
    
    if (permissions && typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); } catch(e){}
    }
    
    const trustee = await Trustee.findById(req.params.id);
    if (!trustee) return res.status(404).json({ success: false, message: "Trustee not found" });

    if (name !== undefined) trustee.name = name;
    if (email !== undefined) trustee.email = email;
    if (mobile !== undefined) trustee.mobile = mobile;
    if (designation !== undefined) trustee.designation = designation;
    if (address !== undefined) trustee.address = address;
    if (systemRole !== undefined) trustee.systemRole = systemRole;
    if (permissions !== undefined) trustee.permissions = permissions;
    if (status !== undefined) trustee.status = status;
    if (password) trustee.password = password; // Will be hashed by Trustee pre-save hook

    await trustee.save();

    const response = trustee.toObject();
    delete response.password;
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTrustee = async (req, res) => {
  try {
    await Trustee.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Trustee deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CRUD for Branch Managers
exports.getBranchManagers = async (req, res) => {
  try {
    const managers = await BranchManager.find().populate("branch", "name").select("-password");
    res.status(200).json({ success: true, data: managers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendBranchManagerOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    const existing = await BranchManager.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Branch Manager already exists with this email" });
    
    const otp = generateOTP();
    await OTPVerification.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const message = `Dear ${name},\n\nThis OTP is used for verification and creation of the Branch Manager role.\n\nYour OTP is: ${otp}\n\nDo not share it.\n\nRegards,\nTrust Management`;
    await sendEmail({ email, subject: "Branch Manager Verification OTP", message });
    
    res.status(200).json({ success: true, message: "OTP sent successfully to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyBranchManagerOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await OTPVerification.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    const verifiedToken = jwt.sign({ email, verified: true }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: '15m' });
    await OTPVerification.deleteMany({ email });

    res.status(200).json({ success: true, message: "Email verified successfully", verifiedToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateNextManagerId = async () => {
  const count = await BranchManager.countDocuments();
  if (count === 0) {
    return "BM-001";
  }
  const managers = await BranchManager.find({}, { managerId: 1 });
  let maxNum = 0;
  managers.forEach((m) => {
    if (m.managerId) {
      const match = m.managerId.match(/^BM-?(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `BM-${String(nextNum).padStart(3, "0")}`;
};

exports.getNextBranchManagerId = async (req, res) => {
  try {
    const managerId = await generateNextManagerId();
    res.status(200).json({ success: true, managerId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBranchManager = async (req, res) => {
  try {
    let { name, managerId, email, mobile, address, branch, password, verifiedToken } = req.body;

    // Verify Token
    try {
      const decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET || "default_secret_key");
      if (decoded.email !== email || !decoded.verified) {
        return res.status(400).json({ success: false, message: "Email verification failed or token mismatch" });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
    }

    if (!managerId || !managerId.trim()) {
      managerId = await generateNextManagerId();
    } else {
      let exists = await BranchManager.findOne({ managerId });
      if (exists) {
        managerId = await generateNextManagerId();
      }
    }

    const bm = await BranchManager.create({ name, managerId, email, mobile, address, branch, password });
    
    try {
      const message = `Dear ${name},\n\nWelcome to Trust Management.\n\nYou have been registered as a Branch Manager.\nYour Manager ID is: ${managerId}\nYour Password is: ${password}\n\nPlease log in to the portal using these credentials and do not share them.\n\nRegards,\nTrust Management`;
      
      await sendEmail({
        email: email,
        subject: "Branch Manager Account Created",
        message: message,
      });
    } catch (emailError) {
      console.error("Email sending failed for Branch Manager:", emailError);
    }
    
    const response = bm.toObject();
    delete response.password;
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBranchManager = async (req, res) => {
  try {
    await BranchManager.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Branch Manager deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBranchManager = async (req, res) => {
  try {
    const { name, managerId, email, mobile, address, branch, password } = req.body;
    const updateData = { name, managerId, email, mobile, address, branch };
    
    const bm = await BranchManager.findById(req.params.id);
    if (!bm) return res.status(404).json({ success: false, message: "Branch Manager not found" });

    Object.assign(bm, updateData);
    if (password) {
      bm.password = password;
    }
    
    await bm.save();
    
    const response = bm.toObject();
    delete response.password;
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin fetching all documents (Read-only view)
exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find().populate("branch", "name").sort({ createdAt: -1 });
    // Note: To remain compatible with the frontend which expects `data` (e.g. res.data.data), 
    // we return `{ success: true, data: documents }`. 
    // Even if it expected `documents`, we can just send it as `data: documents`.
    res.status(200).json({ success: true, data: documents, documents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



exports.getAllAdmins = async (req, res) => { try { const admins = await require('../models/Admin').find().select('-password'); res.json({ success: true, data: admins }); } catch (err) { res.status(500).json({ success: false }); } };

// Get System Settings
exports.getSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({
        adminLoginPin: 'log1008',
        cloudinaryCloudName: '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: ''
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update System Settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const { adminLoginPin, cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = req.body;
    
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings({});
    }

    if (adminLoginPin !== undefined) settings.adminLoginPin = adminLoginPin;
    if (cloudinaryCloudName !== undefined) settings.cloudinaryCloudName = cloudinaryCloudName;
    if (cloudinaryApiKey !== undefined) settings.cloudinaryApiKey = cloudinaryApiKey;
    if (cloudinaryApiSecret !== undefined) settings.cloudinaryApiSecret = cloudinaryApiSecret;

    await settings.save();
    
    res.status(200).json({ success: true, message: "System settings updated successfully", data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
