const express = require("express");
const router = express.Router();
const branchManagerController = require("../controllers/branchManagerController");
const authMiddleware = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes require 'BranchManager' role
router.use(authMiddleware, checkRole("BranchManager"));

router.put("/profile", upload.single("profileImage"), branchManagerController.updateProfile);
router.post("/verify-password", branchManagerController.verifyPassword);
router.get("/stats", branchManagerController.getStats);
router.get("/donations", branchManagerController.getBranchDonations);
router.get("/events", branchManagerController.getBranchEvents);
router.get("/documents", branchManagerController.getBranchDocuments);

module.exports = router;
