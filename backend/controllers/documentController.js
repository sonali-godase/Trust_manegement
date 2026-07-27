const Document = require("../models/Document");
const path = require("path");
const fs = require("fs");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

exports.createDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a PDF file" });
    }

    const { title, description, category } = req.body;
    
    const uploadRes = await uploadToCloudinary(req.file, "documents", { resourceType: "auto" });
    if (!uploadRes) {
      return res.status(500).json({ success: false, message: "Failed to upload document to Cloudinary" });
    }

    const document = new Document({
      title,
      description,
      category,
      pdfName: req.file.originalname,
      pdfUrl: uploadRes.url,
      cloudinaryPublicId: uploadRes.publicId,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      branch: req.body.branchId || undefined // Use branchId from body if provided
    });

    await document.save();
    res.status(201).json({ success: true, document });
  } catch (error) {
    // If error occurs, remove the uploaded file to prevent orphans
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicDocuments = async (req, res) => {
  try {
    const { branchId } = req.query;
    const query = { status: "Approved" };
    if (branchId && branchId !== 'All') {
      query.branch = branchId;
    }

    const documents = await Document.find(query)
      .populate("branch", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { search, category, branchId } = req.query;
    // Allow filtering by branch if provided, otherwise fetch all
    let query = {};
    if (branchId && branchId !== "All") {
      query.branch = branchId;
    }

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (category && category !== "All") {
      query.category = category;
    }

    // Populate branch to send branch name to frontend
    const documents = await Document.find(query).populate("branch", "name").sort({ createdAt: -1 });
    res.json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id });
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id });
    if (!document) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const { title, description, category } = req.body;

    if (title) document.title = title;
    if (description) document.description = description;
    if (category) document.category = category;
    // We no longer allow changing the branch during update
    // document.branch is strictly bound to req.user.branch

    if (req.file) {
      // Delete old asset from Cloudinary
      const oldPublicId = document.cloudinaryPublicId || extractPublicId(document.pdfUrl);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, "raw");
        await deleteFromCloudinary(oldPublicId, "image");
      }

      const uploadRes = await uploadToCloudinary(req.file, "documents", { resourceType: "auto" });
      if (uploadRes) {
        document.pdfName = req.file.originalname;
        document.pdfUrl = uploadRes.url;
        document.cloudinaryPublicId = uploadRes.publicId;
        document.fileSize = req.file.size;
      }
    }

    await document.save();
    res.json({ success: true, document });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id });
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (document.deleteStatus !== "Approved") {
      document.deleteRequested = true;
      document.deletionReason = req.body.reason || "Requested by handler";
      document.deleteStatus = "Pending";
      await document.save();
      return res.json({ success: true, message: "Deletion request submitted to Trustee. Waiting for approval." });
    }

    // Delete file from Cloudinary if approved
    const publicId = document.cloudinaryPublicId || extractPublicId(document.pdfUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId, "raw");
      await deleteFromCloudinary(publicId, "image");
    }

    await document.deleteOne();
    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveDocumentDeletion = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (!document.deleteRequested || document.deleteStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Document is not pending deletion" });
    }

    // Check if this user already approved
    const alreadyApproved = document.deletionApprovals.some(
      (approval) => approval.user.toString() === req.user._id.toString()
    );
    if (alreadyApproved) {
      return res.status(400).json({ success: false, message: "You have already approved this deletion" });
    }

    // Add approval
    document.deletionApprovals.push({
      user: req.user._id,
      role: 'document_admin'
    });

    // Check thresholds: at least 1 document_admin and 1 Trustee
    const hasAdminApproval = document.deletionApprovals.some(a => a.role === 'document_admin');
    const hasTrusteeApproval = document.deletionApprovals.some(a => a.role === 'Trustee');

    if (hasAdminApproval && hasTrusteeApproval) {
      // Threshold met, delete document from Cloudinary
      const publicId = document.cloudinaryPublicId || extractPublicId(document.pdfUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId, "raw");
        await deleteFromCloudinary(publicId, "image");
      }
      await document.deleteOne();
      return res.json({ success: true, message: "Deletion fully approved. Document deleted." });
    } else {
      await document.save();
      return res.json({ success: true, message: "Approval recorded. Waiting for Trustee approval." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
