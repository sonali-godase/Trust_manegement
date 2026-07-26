/**
 * userDashboardRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Protected routes for the user-facing dashboard.
 * All routes require a valid JWT (authMiddleware).
 *
 *   GET  /api/user/profile         → User profile data
 *   PUT  /api/user/profile         → Update profile (with photo upload)
 *   GET  /api/user/my-orders       → User's pooja bookings
 *   GET  /api/user/my-donations    → User's donation history
 *   GET  /api/user/my-annadaan     → User's annadaan participations
 *   GET  /api/user/dashboard-stats → Summary counts for dashboard home
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const express        = require("express");
const router         = express.Router();
const multer         = require("multer");
const path           = require("path");
const fs             = require("fs");
const authMiddleware = require("../middleware/authMiddleware");
const controller     = require("../controllers/userDashboardController");

// ─── Multer config for profile photo uploads ─────────────────────────────────

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed."));
    }
  },
});

// ─── All routes require authentication ───────────────────────────────────────

router.use(authMiddleware);

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/profile", controller.getProfile);
router.put("/profile", upload.fields([{ name: "profilePhoto", maxCount: 1 }, { name: "profileImage", maxCount: 1 }]), controller.updateProfile);
router.get("/my-donations", controller.getMyDonations);
router.get("/my-donations/:id/receipt", controller.downloadReceipt);
router.get("/my-annadaan", controller.getMyAnnadaan);
router.get("/my-annadaan/:id/receipt", controller.downloadAnnadaanReceipt);
router.delete("/my-annadaan/:id", controller.cancelAnnadaan);
router.get("/dashboard-stats", controller.getDashboardStats);

module.exports = router;
