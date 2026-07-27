const express = require("express");
const router = express.Router();
const { login, setup, getAdmins, createAdmin, deleteAdmin } = require("../controllers/documentAuthController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/login", login);

router.post("/setup", setup); // Hidden route to create first admin

// Super Admin routes for managing Document Admins
router.get("/", authMiddleware, getAdmins);
router.post("/send-otp", authMiddleware, require("../controllers/documentAuthController").sendAdminOtp);
router.post("/verify-otp", authMiddleware, require("../controllers/documentAuthController").verifyAdminOtp);
router.post("/", authMiddleware, createAdmin);

// Document Handler self-management routes
router.put("/profile", authMiddleware, upload.single("profileImage"), require("../controllers/documentAuthController").updateProfile);
router.post("/verify-password", authMiddleware, require("../controllers/documentAuthController").verifyPassword);
router.put("/password", authMiddleware, require("../controllers/documentAuthController").updatePassword);
router.put("/:id", authMiddleware, require("../controllers/documentAuthController").updateAdmin);
router.delete("/:id", authMiddleware, deleteAdmin);

module.exports = router;
