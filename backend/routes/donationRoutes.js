const express = require("express");
const router = express.Router();
const donationController = require("../controllers/donationController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");

// Public route to verify receipts
router.get("/verify/:receiptNumber", donationController.verifyReceipt);

// User creating a donation (can be public or authenticated, let's assume public since they provide email/phone)
router.post("/create", optionalAuthMiddleware, upload.single("screenshot"), donationController.createDonation);

// Update a donation before payment
router.put("/:id/update", donationController.updateDonation);

// Submit payment (upload screenshot) - also can be public given they just need the ID from step 1
router.post("/:id/payment", upload.single("screenshot"), donationController.submitPayment);

// The following routes require authentication
router.use(authMiddleware);

// Get all donations (Accessible to Admin, Trustee, Accountant, BranchManager, etc.)
router.get("/", donationController.getAllDonations);

// Get pending donations
router.get("/pending", donationController.getPendingDonations);

// Get dashboard stats
router.get("/stats", donationController.getDashboardStats);

// Get receipt PDF (Accessible to all authenticated roles)
router.get("/:id/receipt", donationController.downloadReceipt);

router.use(checkPermission('Donations'));

// Approve donation
router.post("/:id/approve", donationController.approveDonation);

// Regenerate receipt
router.post("/:id/regenerate-receipt", donationController.regenerateReceipt);

// Reject donation
router.post("/:id/reject", donationController.rejectDonation);

module.exports = router;
