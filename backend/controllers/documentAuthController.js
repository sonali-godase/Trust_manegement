const DocumentAdmin = require("../models/DocumentAdmin");
const Branch = require("../models/Branch");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const OTPVerification = require("../models/OTPVerification");
const generateOTP = require("../utils/otpGenerator");
const sendEmail = require("../utils/sendEmail");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret_key", {
    expiresIn: "30d"
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await DocumentAdmin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        success: true,
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin._id)
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.setup = async (req, res) => {
  try {
    const adminCount = await DocumentAdmin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ success: false, message: "Admin already exists" });
    }

    const admin = new DocumentAdmin({
      email: "admin@documents.com",
      password: "password123",
      role: "document_admin"
    });

    await admin.save();
    res.status(201).json({ success: true, message: "Default document admin created" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Super Admin Methods
exports.getAdmins = async (req, res) => {
  try {
    const admins = await DocumentAdmin.find().select("-password");
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const existing = await DocumentAdmin.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Admin already exists with this email" });
    
    const otp = generateOTP();
    await OTPVerification.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const message = `Dear Document Admin,\n\nThis OTP is used for verification and creation of your role.\n\nYour OTP is: ${otp}\n\nDo not share it.\n\nRegards,\nTrust Management`;
    await sendEmail({ email, subject: "Document Admin Verification OTP", message });
    
    res.status(200).json({ success: true, message: "OTP sent successfully to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyAdminOtp = async (req, res) => {
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

exports.createAdmin = async (req, res) => {
  try {
    const { email, password, contactNo, status, verifiedToken } = req.body;
    
    // Verify Token
    try {
      const decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET || "default_secret_key");
      if (decoded.email !== email || !decoded.verified) {
        return res.status(400).json({ success: false, message: "Email verification failed or token mismatch" });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
    }

    const exists = await DocumentAdmin.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Email already exists" });

    const newAdmin = new DocumentAdmin({
      email,
      password,
      contactNo,
      status: status || "Active"
    });

    await newAdmin.save();
    
    const populatedAdmin = await DocumentAdmin.findById(newAdmin._id).select("-password");
    
    res.status(201).json({ success: true, data: populatedAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await DocumentAdmin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    
    const publicId = admin.profilePhotoPublicId || extractPublicId(admin.profilePhoto);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    await DocumentAdmin.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { contactNo, status, password } = req.body;
    
    const admin = await DocumentAdmin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (contactNo) admin.contactNo = contactNo;
    if (status) admin.status = status;
    if (password) admin.password = password; // Will be hashed by pre-save hook

    await admin.save();
    
    const updatedAdmin = await DocumentAdmin.findById(admin._id).select("-password");
    res.status(200).json({ success: true, data: updatedAdmin, message: "Admin updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Document Handler self-update methods
exports.updateProfile = async (req, res) => {
  try {
    const { contactNo, name, address } = req.body;
    
    // Check for either req.user._id or req.user.id depending on auth middleware
    const adminId = req.user._id || req.user.id;

    const admin = await DocumentAdmin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (contactNo !== undefined) admin.contactNo = contactNo;
    if (name !== undefined) admin.name = name;
    if (address !== undefined) admin.address = address;

    const file = req.file || (req.files && (req.files.profilePhoto?.[0] || req.files.profileImage?.[0]));
    if (file) {
      const oldPublicId = admin.profilePhotoPublicId || extractPublicId(admin.profilePhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
      const uploadRes = await uploadToCloudinary(file, "profiles", { resourceType: "image" });
      if (uploadRes) {
        admin.profilePhoto = uploadRes.url;
        admin.profilePhotoPublicId = uploadRes.publicId;
      } else {
        return res.status(400).json({ success: false, message: "Cloudinary upload failed. Please verify Cloudinary configuration." });
      }
    }

    await admin.save();
    
    const response = admin.toObject();
    delete response.password;
    res.status(200).json({ success: true, message: "Profile updated successfully", data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user._id || req.user.id;

    const admin = await DocumentAdmin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
