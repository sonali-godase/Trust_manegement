const Donation = require("../models/Donation");
const Branch = require("../models/Branch");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { issueReceipt } = require("../utils/receiptEngine");
const { generateReceiptPdf } = require("../utils/generateReceipt");
const { englishToMarathi } = require("../utils/transliterate");

// Generate Unique Reference (DON-YYYY-XXXXX)
const generateDonationRef = async () => {
  const year = new Date().getFullYear();
  const latest = await Donation.findOne({ donationReference: new RegExp(`^DON-${year}-`) })
    .sort({ donationReference: -1 })
    .collation({ locale: "en_US", numericOrdering: true });
    
  let nextSeq = 1;
  if (latest && latest.donationReference) {
    const parts = latest.donationReference.split('-');
    if (parts.length === 3) {
      nextSeq = parseInt(parts[2], 10) + 1;
    }
  }
  const sequence = String(nextSeq).padStart(5, '0');
  return `DON-${year}-${sequence}`;
};

// Generate Receipt Number
const generateReceiptRef = async (donationType) => {
  const year = new Date().getFullYear();
  let prefix = "RCT";
  if (donationType === "jama_pavti") prefix = "JP";
  else if (donationType === "shakha_pavti") prefix = "SP";
  else if (donationType === "dengi_pavti") prefix = "DP";

  const latest = await Donation.findOne({ receiptNumber: new RegExp(`^${prefix}-${year}-`) })
    .sort({ receiptNumber: -1 })
    .collation({ locale: "en_US", numericOrdering: true });

  let nextSeq = 1;
  if (latest && latest.receiptNumber) {
    const parts = latest.receiptNumber.split('-');
    if (parts.length === 3) {
      nextSeq = parseInt(parts[2], 10) + 1;
    }
  }
  const sequence = String(nextSeq).padStart(6, '0'); // requested format JP-2026-000101
  return `${prefix}-${year}-${sequence}`;
};

exports.createDonation = async (req, res) => {
  try {
    const { donorName, email, phone, address, amount, branchId, message, utrNumber, upiId, paymentApp, donationType } = req.body;
    
    let dbBranchId = undefined;
    const cleanBranchId = branchId ? String(branchId).trim() : '';
    if (cleanBranchId && cleanBranchId !== 'global' && cleanBranchId !== 'undefined' && cleanBranchId !== 'null') {
      try {
        const branch = await Branch.findById(cleanBranchId);
        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });
        dbBranchId = cleanBranchId;
      } catch (err) {
        if (err.name === 'CastError') {
          return res.status(400).json({ success: false, message: "Invalid Branch ID." });
        }
        throw err;
      }
    }
    
    let finalDonationType = donationType || "dengi_pavti";

    if (!utrNumber) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "UTR Number is required." });
    }

    if (!/^\d{12}$/.test(utrNumber)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Invalid UTR Number. Must be exactly 12 numeric digits." });
    }

    // Check for duplicate UTR
    const existingUtr = await Donation.findOne({ utrNumber });
    if (existingUtr) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "This UTR Number has already been submitted." });
    }

    let screenshotUrl = null;
    if (req.file) {
      const cloudinaryInstance = await cloudinary.getCloudinary();
      if (cloudinaryInstance) {
        try {
          const result = await cloudinaryInstance.uploader.upload(req.file.path, {
            folder: "trust_donations",
          });
          screenshotUrl = result.secure_url;
          fs.unlinkSync(req.file.path);
        } catch (uploadError) {
          console.error("Cloudinary upload failed, falling back to local static URL:", uploadError.message);
          screenshotUrl = `/uploads/${req.file.filename}`;
        }
      } else {
        console.log("Cloudinary not configured, falling back to local static URL.");
        screenshotUrl = `/uploads/${req.file.filename}`;
      }
    }

    let donationReference;
    let donation;
    let saved = false;
    let retries = 5;

    while (!saved && retries > 0) {
      try {
        donationReference = await generateDonationRef();
        donation = new Donation({
          donationReference,
          donorName,
          email,
          phone,
          address,
          amount,
          branchId: dbBranchId,
          message,
          utrNumber,
          upiId,
          paymentApp,
          screenshotUrl,
          donationType: finalDonationType,
          status: "PENDING_VERIFICATION",
          userId: req.user ? req.user._id : undefined
        });

        await donation.save();
        saved = true;
      } catch (saveError) {
        if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.donationReference) {
          retries -= 1;
        } else {
          throw saveError;
        }
      }
    }

    if (!saved) {
      throw new Error("Failed to generate unique donation reference after multiple retries.");
    }
    
    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { donorName, email, phone, address, amount, branchId, message } = req.body;
    
    const donation = await Donation.findById(id);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });
    
    if (donation.status !== "PENDING_PAYMENT") {
      return res.status(400).json({ success: false, message: "Cannot update donation after payment submission" });
    }

    donation.donorName = donorName || donation.donorName;
    donation.email = email || donation.email;
    donation.phone = phone || donation.phone;
    donation.address = address || donation.address;
    donation.amount = amount || donation.amount;
    donation.message = message !== undefined ? message : donation.message;

    if (branchId) {
      const cleanBranchId = String(branchId).trim();
      if (cleanBranchId === 'global' || cleanBranchId === 'undefined' || cleanBranchId === 'null') {
        donation.branchId = undefined;
      } else {
        try {
          const branch = await Branch.findById(cleanBranchId);
          if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });
          donation.branchId = cleanBranchId;
        } catch (err) {
          if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: "Invalid Branch ID." });
          }
          throw err;
        }
      }
    }

    await donation.save();

    res.status(200).json({ success: true, data: donation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.submitPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { utrNumber, upiId, paymentApp } = req.body;

    if (!utrNumber) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "UTR Number is required." });
    }

    if (!/^\d{12}$/.test(utrNumber)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Invalid UTR Number. Must be exactly 12 numeric digits." });
    }

    // Check for duplicate UTR
    const existingUtr = await Donation.findOne({ utrNumber });
    if (existingUtr && existingUtr._id.toString() !== id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "This UTR Number has already been submitted." });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Donation not found" });
    }

    if (donation.status !== "PENDING_PAYMENT" && donation.status !== "REJECTED") {
       if (req.file) fs.unlinkSync(req.file.path);
       return res.status(400).json({ success: false, message: "Donation is already in processing." });
    }

    let screenshotUrl = donation.screenshotUrl;

    if (req.file) {
      const cloudinaryInstance = await cloudinary.getCloudinary();
      if (cloudinaryInstance) {
        try {
          const result = await cloudinaryInstance.uploader.upload(req.file.path, {
            folder: "trust_donations",
          });
          screenshotUrl = result.secure_url;
          fs.unlinkSync(req.file.path);
        } catch (uploadError) {
          console.error("Cloudinary upload failed, falling back to local static URL:", uploadError.message);
          screenshotUrl = `/uploads/${req.file.filename}`;
        }
      } else {
        console.log("Cloudinary not configured, falling back to local static URL.");
        screenshotUrl = `/uploads/${req.file.filename}`;
      }
    }

    donation.utrNumber = utrNumber;
    donation.upiId = upiId;
    donation.paymentApp = paymentApp;
    donation.screenshotUrl = screenshotUrl;
    donation.status = "PENDING_VERIFICATION";
    
    await donation.save();

    res.status(200).json({ success: true, message: "Payment submitted successfully. Awaiting verification.", data: donation });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
       fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper for query filters
const buildFilterQuery = (req, baseQuery = {}) => {
  let query = { ...baseQuery };
  

  if (req.user) {
    if (req.user.role === "Devotee") {
      query.userId = req.user._id;
    } else if (req.user.role === "BranchManager") {
      query.branchId = req.user.branch;
    }
  }

  const { branchId, dateFilter, startDate, endDate } = req.query || {};

  if (branchId && req.user && req.user.role !== "BranchManager" && req.user.role !== "Devotee") {
    query.branchId = branchId;
  }

  let start = null;
  let end = new Date();

  if (dateFilter === "week") {
    end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setMilliseconds(-1);
    start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (dateFilter === "month") {
    const today = new Date();
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
  } else if (dateFilter === "year") {
    const today = new Date();
    start = new Date(today.getFullYear() - 1, 0, 1);
    end = new Date(today.getFullYear() - 1, 11, 31);
    end.setHours(23, 59, 59, 999);
  } else if (dateFilter === "custom" && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  }

  if (start) {
    query.date = { $gte: start, $lte: end };
  }

  return query;
};

exports.getPendingDonations = async (req, res) => {
  try {
    const query = buildFilterQuery(req, { status: "PENDING_VERIFICATION" });


    const donations = await Donation.find(query)
                                    .populate('branchId', 'name location')
                                    .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });

    if (donation.status === "APPROVED") {
      return res.status(400).json({ success: false, message: "Donation is already approved." });
    }

    donation.status = "APPROVED";
    donation.approvedBy = req.user._id;
    donation.approvedByModel = req.user.role; // e.g., 'Admin' or 'BranchManager'
    donation.approvalDate = new Date();
    donation.approvalRemarks = remarks;
    
    let pdfUrl = `/api/donations/${donation._id}/receipt`;
    donation.receiptNumber = donation.donationReference;
    donation.receiptPdfUrl = pdfUrl;
    
    await donation.save();

    try {
      if (donation.email && pdfUrl) {
        const pdfBuffer = await generateReceiptPdf(donation.toObject());
        await sendEmail({
          email: donation.email,
          subject: "Your Donation Receipt - Kolekar Maha Swamiji Monastery",
          message: `Dear ${donation.donorName},\n\nWe sincerely thank you for your generous donation of INR ${donation.amount}/-. Your payment has been successfully verified and approved.\n\nPlease find your official donation receipt attached to this email.\n\nYou can also download it from our portal here: ${pdfUrl}\n\nMay the divine blessings of Kolekar Maha Swamiji be always with you and your family.\n\nRegards,\nShri Gurumurti Rudrapashupati Lingayat Monastery Trust`,
          attachments: [
            {
              filename: `Donation_Receipt_${donation.receiptNumber || donation.donationReference}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
      }
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
    }

    res.status(200).json({ success: true, message: "Donation approved successfully.", data: donation, pdfUrl: pdfUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required." });
    }

    const donation = await Donation.findById(id);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });

    if (donation.status === "APPROVED") {
      return res.status(400).json({ success: false, message: "Cannot reject an already approved donation." });
    }

    donation.status = "REJECTED";
    donation.rejectionReason = reason;

    await donation.save();

    try {
      if (donation.email) {
        await sendEmail({
          email: donation.email,
          subject: "Update on your Donation Submission - Kolekar Maha Swamiji Monastery",
          message: `Dear ${donation.donorName},\n\nWe hope this email finds you well.\n\nWe are writing to inform you that your recent donation submission of INR ${donation.amount}/- could not be verified and has been rejected for the following reason:\n\n"${reason}"\n\nWe sincerely apologize for any inconvenience this may have caused. If you believe this is an error, or if you need any assistance regarding your payment, please do not hesitate to contact our support team. We are here to help.\n\nRegards,\nShri Gurumurti Rudrapashupati Lingayat Monastery Trust`
        });
      }
    } catch (emailError) {
      console.error("Error sending rejection email:", emailError);
    }

    res.status(200).json({ success: true, message: "Donation rejected.", data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllDonations = async (req, res) => {
  try {
    const query = buildFilterQuery(req, {});
    const donations = await Donation.find(query)
                                    .populate('branchId', 'name location')
                                    .sort({ date: -1 });
    res.status(200).json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const matchQuery = buildFilterQuery(req, {});

    const totalDonations = await Donation.countDocuments(matchQuery);
    const approvedDonations = await Donation.countDocuments({ ...matchQuery, status: "APPROVED" });
    const pendingVerification = await Donation.countDocuments({ ...matchQuery, status: "PENDING_VERIFICATION" });
    const rejectedDonations = await Donation.countDocuments({ ...matchQuery, status: "REJECTED" });
    
    // Aggregation for total collection
    const collectionResult = await Donation.aggregate([
      { $match: { ...matchQuery, status: "APPROVED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalCollection = collectionResult.length > 0 ? collectionResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalDonations,
        approvedDonations,
        pendingVerification,
        rejectedDonations,
        totalCollection
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const donation = await Donation.findOne({ receiptNumber, status: "APPROVED" })
                                   .populate('branchId', 'name');
    
    if (!donation) {
      return res.status(404).json({ success: false, message: "Invalid or unapproved receipt." });
    }

    res.status(200).json({
      success: true,
      data: {
        receiptNumber: donation.receiptNumber,
        donationReference: donation.donationReference,
        donorName: donation.donorName,
        amount: donation.amount,
        date: donation.date,
        approvalDate: donation.approvalDate,
        branchName: donation.branchId ? donation.branchId.name : "Main Trust"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation record not found." });
    }

    if (donation.status !== "APPROVED") {
      return res.status(400).json({ success: false, message: "Receipt is only available for approved donations." });
    }

    // Branch Managers should only access their branch's receipts
    if (req.user.role === "BranchManager" && donation.branchId && donation.branchId.toString() !== req.user.branch.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to access this receipt." });
    }

    // Update last downloaded timestamp
    donation.lastReceiptDownloadedAt = new Date();
    await donation.save();

    const pdfBuffer = await generateReceiptPdf(donation);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Donation_Receipt_${donation.receiptNumber || donation.donationReference}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[donationController][ERROR] downloadReceipt:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate receipt PDF." });
  }
};

