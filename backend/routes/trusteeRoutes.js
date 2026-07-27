const express = require("express");
const router = express.Router();
const trusteeController = require("../controllers/trusteeController");
const authMiddleware = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public route to fetch trustees
router.get("/public", trusteeController.getPublicTrustees);

// Fetch roles for announcement targeting (open to all authenticated users)
router.get('/admins-list', authMiddleware, trusteeController.getAllAdmins);
router.get('/branch-managers', authMiddleware, trusteeController.getBranchManagers);
router.get('/document-admin', authMiddleware, trusteeController.getDocumentAdmins);
router.get('/accountants', authMiddleware, trusteeController.getAccountants);

// All routes require 'Trustee' role
router.use(authMiddleware, checkRole(["Trustee"]));

router.get("/stats", trusteeController.getStats); // No permission needed for stats or let it be dashboard
router.get("/pending-counts", trusteeController.getPendingCounts);

// Documents
router.get("/documents", checkPermission('Documents'), trusteeController.getAllDocuments);
router.get("/documents/pending", checkPermission('Documents'), trusteeController.getPendingDocuments);
router.put("/documents/:id/review", checkPermission('Documents'), trusteeController.reviewDocument);

// Document Approval Workflow Requests
router.get("/documents/requests", checkPermission('Documents'), trusteeController.getDocumentRequests);
router.put("/documents/requests/:id/action", checkPermission('Documents'), trusteeController.processDocumentRequest);

// Document Deletion Request Routes
router.get("/documents/deletion-requests", checkPermission('Documents'), trusteeController.getDeletionRequests);
router.put("/documents/:id/review-deletion", checkPermission('Documents'), trusteeController.reviewDeletionRequest);

// Profile Route
router.get("/profile/logins", trusteeController.getRecentLogins);
router.put("/profile", upload.single('profileImage'), trusteeController.updateProfile);
router.post("/verify-password", trusteeController.verifyPassword);

module.exports = router;
