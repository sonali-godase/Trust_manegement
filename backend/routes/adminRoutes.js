const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes here are protected and require 'Admin' role
router.use(authMiddleware, checkRole("Admin"));

router.get("/stats", adminController.getStats);

// Trustees
router.get("/trustees", adminController.getTrustees);
router.post("/trustees/send-otp", adminController.sendTrusteeOtp);
router.post("/trustees/verify-otp", adminController.verifyTrusteeOtp);
router.post("/trustees", upload.single('audioTrack'), adminController.createTrustee);
router.put("/trustees/:id", upload.single('audioTrack'), adminController.updateTrustee);
router.delete("/trustees/:id", adminController.deleteTrustee);

// Branch Managers
router.get("/branch-managers", adminController.getBranchManagers);
router.get("/branch-managers/next-id", adminController.getNextBranchManagerId);
router.post("/branch-managers/send-otp", adminController.sendBranchManagerOtp);
router.post("/branch-managers/verify-otp", adminController.verifyBranchManagerOtp);
router.post("/branch-managers", upload.single('audioTrack'), adminController.createBranchManager);
router.put("/branch-managers/:id", upload.single('audioTrack'), adminController.updateBranchManager);
router.delete("/branch-managers/:id", adminController.deleteBranchManager);

// Documents (Read-only for Admin)
router.get("/documents", adminController.getAllDocuments);

router.get('/admins-list', adminController.getAllAdmins);

// System Settings
router.get("/settings", adminController.getSystemSettings);
router.put("/settings", adminController.updateSystemSettings);

module.exports = router;

