const Accountant = require("../models/Accountant");
const OTPVerification = require("../models/OTPVerification");
const generateOTP = require("../utils/otpGenerator");
const sendEmail = require("../utils/sendEmail");
const { logAction } = require("./auditController");
const jwt = require("jsonwebtoken");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

// Send OTP for Accountant Email Verification
exports.sendVerificationOtp = async (req, res) => {
  try {
    const { email, name } = req.body;

    const existingUser = await Accountant.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Accountant already exists with this email" });
    }

    const otp = generateOTP();
    await OTPVerification.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
    });

    const message = `Dear ${name},\n\nThis OTP is used for verification and creation of the accountant role.\n\nYour OTP is: ${otp}\n\nDo not share it. Don't misuse your rights.\n\nRegards,\nTrust Management`;

    await sendEmail({
      email,
      subject: "Accountant Verification OTP",
      message
    });

    res.status(200).json({ success: true, message: "OTP sent successfully to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTPVerification.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    // Generate a temporary token to prove verification during creation
    const verifiedToken = jwt.sign({ email, verified: true }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: '15m' });
    
    await OTPVerification.deleteMany({ email });

    res.status(200).json({ success: true, message: "Email verified successfully", verifiedToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Accountant
exports.createAccountant = async (req, res) => {
  try {
    const { fullName, email, phone, address, joiningDate, password, profilePhoto, verifiedToken } = req.body;

    // Verify the email was actually verified
    try {
      const decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET || "default_secret_key");
      if (decoded.email !== email || !decoded.verified) {
        return res.status(400).json({ success: false, message: "Email verification failed or token mismatch" });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
    }

    const newAccountant = await Accountant.create({
      fullName,
      email,
      phone,
      address,
      joiningDate,
      password,
      profilePhoto,
      createdByTrusteeId: req.user._id,
      emailVerified: true,
      accountStatus: "active"
    });

    await logAction({
      userId: req.user._id,
      role: req.user.role,
      action: "Created Accountant",
      details: { accountantId: newAccountant._id, email: newAccountant.email },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: "Accountant created successfully", accountant: newAccountant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Accountants
exports.getAccountants = async (req, res) => {
  try {
    const accountants = await Accountant.find().select("-password");
    res.status(200).json({ success: true, accountants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Accountant
exports.updateAccountant = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address, profilePhoto } = req.body;

    const accountant = await Accountant.findById(id);
    if (!accountant) return res.status(404).json({ success: false, message: "Accountant not found" });

    accountant.fullName = fullName || accountant.fullName;
    accountant.phone = phone || accountant.phone;
    accountant.address = address || accountant.address;
    accountant.profilePhoto = profilePhoto || accountant.profilePhoto;

    await accountant.save();

    await logAction({
      userId: req.user._id,
      role: req.user.role,
      action: "Updated Accountant",
      details: { accountantId: accountant._id, updatedFields: req.body },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: "Accountant updated successfully", accountant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Accountant from MongoDB
exports.deleteAccountant = async (req, res) => {
  try {
    const { id } = req.params;
    const accountant = await Accountant.findById(id);
    
    const publicId = accountant.profilePhotoPublicId || extractPublicId(accountant.profilePhoto);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    await Accountant.findByIdAndDelete(id);

    await logAction({
      userId: req.user._id,
      role: req.user.role,
      action: "Deleted Accountant",
      details: { accountantId: id, email: accountant.email },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: "Accountant deleted successfully from database" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Accountant Profile Update (Self)
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address, profilePhoto } = req.body;
    
    // Accountant is logged in
    const accountant = await Accountant.findById(req.user._id);
    if (!accountant) return res.status(404).json({ success: false, message: "Accountant not found" });

    if (fullName !== undefined) accountant.fullName = fullName;
    if (phone !== undefined) accountant.phone = phone;
    if (address !== undefined) accountant.address = address;
    if (profilePhoto !== undefined) accountant.profilePhoto = profilePhoto;

    const file = req.file || (req.files && (req.files.profilePhoto?.[0] || req.files.profileImage?.[0]));
    if (file) {
      const oldPublicId = accountant.profilePhotoPublicId || extractPublicId(accountant.profilePhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
      const uploadRes = await uploadToCloudinary(file, "profiles", { resourceType: "image" });
      if (uploadRes) {
        accountant.profilePhoto = uploadRes.url;
        accountant.profilePhotoPublicId = uploadRes.publicId;
      } else {
        return res.status(400).json({ success: false, message: "Cloudinary upload failed. Please verify Cloudinary configuration." });
      }
    }

    await accountant.save();

    await logAction({
      userId: req.user._id,
      role: "Accountant",
      action: "Updated Profile",
      ipAddress: req.ip
    });

    const userResponse = accountant.toObject();
    delete userResponse.password;
    userResponse.name = accountant.fullName;

    res.status(200).json({ success: true, message: "Profile updated successfully", user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
