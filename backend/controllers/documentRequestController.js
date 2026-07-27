const DocumentRequest = require("../models/DocumentRequest");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const fs = require("fs");
const path = require("path");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

// @desc    Submit a document CRUD request for Trustee approval
// @route   POST /api/documents/requests
// @access  Private (DocumentHandler, DocumentAdmin, Trustee, Admin)
exports.createDocumentRequest = async (req, res) => {
  try {
    const { requestType, targetDocumentId, title, description, category, branchId, deletionReason } = req.body;
    
    const safeUnlink = (f) => { if (f && f.path && fs.existsSync(f.path)) { try { fs.unlinkSync(f.path); } catch(e){} } };

    if (!["Create", "Update", "Delete"].includes(requestType)) {
      safeUnlink(req.file);
      return res.status(400).json({ success: false, message: "Invalid request type" });
    }

    let targetDoc = null;
    if (["Update", "Delete"].includes(requestType)) {
      if (!targetDocumentId) {
        safeUnlink(req.file);
        return res.status(400).json({ success: false, message: "Target document ID is required for update or delete requests" });
      }
      targetDoc = await Document.findById(targetDocumentId);
      if (!targetDoc) {
        safeUnlink(req.file);
        return res.status(404).json({ success: false, message: "Target document not found" });
      }
    }

    let documentData = {};
    let uploadRes = null;
    if (req.file) {
      uploadRes = await uploadToCloudinary(req.file, "documents", { resourceType: "auto" });
      if (!uploadRes) {
        return res.status(500).json({ success: false, message: "Failed to upload file to Cloudinary" });
      }
    }

    if (requestType === "Create") {
      if (!uploadRes) {
        return res.status(400).json({ success: false, message: "Please upload a document file for creation" });
      }
      documentData = {
        title: title || req.file.originalname,
        description: description || "Document upload request",
        category: category || "Other",
        pdfName: req.file.originalname,
        pdfUrl: uploadRes.url,
        cloudinaryPublicId: uploadRes.publicId,
        fileSize: req.file.size,
        branch: branchId || req.user.branch || undefined
      };
    } else if (requestType === "Update") {
      documentData = {
        title: title || targetDoc.title,
        description: description || targetDoc.description,
        category: category || targetDoc.category,
        pdfName: uploadRes ? req.file.originalname : targetDoc.pdfName,
        pdfUrl: uploadRes ? uploadRes.url : targetDoc.pdfUrl,
        cloudinaryPublicId: uploadRes ? uploadRes.publicId : targetDoc.cloudinaryPublicId,
        fileSize: uploadRes ? req.file.size : targetDoc.fileSize,
        branch: branchId || targetDoc.branch
      };
    } else if (requestType === "Delete") {
      documentData = {
        title: targetDoc.title,
        description: deletionReason || description || "Deletion request",
        category: targetDoc.category,
        pdfName: targetDoc.pdfName,
        pdfUrl: targetDoc.pdfUrl,
        cloudinaryPublicId: targetDoc.cloudinaryPublicId,
        fileSize: targetDoc.fileSize,
        branch: targetDoc.branch
      };
    }

    const requestedByModel = (req.user.role === 'document_admin' || req.user.role === 'DocumentHandler') 
      ? 'DocumentAdmin' 
      : (req.user.role || 'DocumentAdmin');

    const docRequest = new DocumentRequest({
      requestType,
      targetDocument: targetDoc ? targetDoc._id : undefined,
      documentData,
      requestedBy: req.user._id,
      requestedByModel,
      status: "Pending"
    });

    await docRequest.save();

    // Log Audit Trail
    try {
      await AuditLog.create({
        userId: req.user._id,
        role: req.user.role || requestedByModel,
        action: `Submitted ${requestType} Document Request`,
        details: { requestId: docRequest._id, title: documentData.title, requestType },
        ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown'
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    res.status(201).json({
      success: true,
      message: `Document ${requestType} request submitted successfully for Trustee approval.`,
      request: docRequest
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error creating document request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all document requests (filtered by role / requestedBy)
// @route   GET /api/documents/requests
// @access  Private (DocumentHandler, DocumentAdmin, Trustee, Admin)
exports.getDocumentRequests = async (req, res) => {
  try {
    const { status, requestType } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (requestType && requestType !== 'All') {
      query.requestType = requestType;
    }

    // Document Handler only sees requests they created (or for their branch)
    if (req.user.role === 'DocumentHandler' || req.user.role === 'document_admin' || req.user.role === 'DocumentAdmin') {
      query.requestedBy = req.user._id;
    }

    const requests = await DocumentRequest.find(query)
      .populate("requestedBy", "name fullName email")
      .populate("targetDocument")
      .populate("documentData.branch", "name")
      .populate("reviewedBy", "name fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("Error fetching document requests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or Reject a document request (Trustee action)
// @route   PUT /api/documents/requests/:id/action
// @access  Private (Trustee, Admin)
exports.processDocumentRequest = async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: 'Approve' | 'Reject'
    
    if (!["Approve", "Reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'Approve' or 'Reject'" });
    }

    const docRequest = await DocumentRequest.findById(req.params.id);
    if (!docRequest) {
      return res.status(404).json({ success: false, message: "Document request not found" });
    }

    if (docRequest.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Request has already been ${docRequest.status.toLowerCase()}` });
    }

    if (action === "Approve") {
      // Execute the requested CRUD operation automatically
      if (docRequest.requestType === "Create") {
        const newDoc = new Document({
          title: docRequest.documentData.title,
          description: docRequest.documentData.description,
          category: docRequest.documentData.category,
          pdfName: docRequest.documentData.pdfName,
          pdfUrl: docRequest.documentData.pdfUrl,
          cloudinaryPublicId: docRequest.documentData.cloudinaryPublicId,
          fileSize: docRequest.documentData.fileSize,
          uploadedBy: docRequest.requestedBy,
          branch: docRequest.documentData.branch || undefined,
          status: "Approved",
          reviewedBy: req.user._id,
          reviewComment: remarks || "Approved by Trustee"
        });
        await newDoc.save();
        docRequest.targetDocument = newDoc._id;
      } else if (docRequest.requestType === "Update") {
        const targetDoc = await Document.findById(docRequest.targetDocument);
        if (targetDoc) {
          targetDoc.title = docRequest.documentData.title || targetDoc.title;
          targetDoc.description = docRequest.documentData.description || targetDoc.description;
          targetDoc.category = docRequest.documentData.category || targetDoc.category;
          if (docRequest.documentData.pdfUrl && docRequest.documentData.pdfUrl !== targetDoc.pdfUrl) {
            // Delete old Cloudinary file if replaced
            const oldPublicId = targetDoc.cloudinaryPublicId || extractPublicId(targetDoc.pdfUrl);
            if (oldPublicId) {
              await deleteFromCloudinary(oldPublicId, "raw");
              await deleteFromCloudinary(oldPublicId, "image");
            }
            targetDoc.pdfName = docRequest.documentData.pdfName;
            targetDoc.pdfUrl = docRequest.documentData.pdfUrl;
            targetDoc.cloudinaryPublicId = docRequest.documentData.cloudinaryPublicId;
            targetDoc.fileSize = docRequest.documentData.fileSize;
          }
          targetDoc.status = "Approved";
          targetDoc.reviewedBy = req.user._id;
          targetDoc.reviewComment = remarks || "Updated via Trustee Approval";
          await targetDoc.save();
        }
      } else if (docRequest.requestType === "Delete") {
        const targetDoc = await Document.findById(docRequest.targetDocument);
        if (targetDoc) {
          const publicId = targetDoc.cloudinaryPublicId || extractPublicId(targetDoc.pdfUrl);
          if (publicId) {
            await deleteFromCloudinary(publicId, "raw");
            await deleteFromCloudinary(publicId, "image");
          }
          await targetDoc.deleteOne();
        }
      }

      docRequest.status = "Approved";
    } else if (action === "Reject") {
      docRequest.status = "Rejected";
    }

    docRequest.trusteeRemarks = remarks || "";
    docRequest.reviewedBy = req.user._id;
    docRequest.reviewedAt = new Date();
    await docRequest.save();

    // Log Audit Trail
    try {
      await AuditLog.create({
        userId: req.user._id,
        role: req.user.role || 'Trustee',
        action: `${action}d Document Request`,
        details: {
          requestId: docRequest._id,
          requestType: docRequest.requestType,
          trusteeRemarks: remarks,
          status: docRequest.status
        },
        ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown'
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    res.status(200).json({
      success: true,
      message: `Document ${docRequest.requestType} request ${action.toLowerCase()}d successfully.`,
      request: docRequest
    });
  } catch (error) {
    console.error("Error processing document request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
