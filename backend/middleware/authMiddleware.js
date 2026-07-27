const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Trustee = require("../models/Trustee");
const Devotee = require("../models/Devotee");
const BranchManager = require("../models/BranchManager");
const Accountant = require("../models/Accountant");
const DocumentAdmin = require("../models/DocumentAdmin");

module.exports = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized to access this route" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");

    let user = null;
    switch (decoded.role) {
      case "Admin":
        user = await Admin.findById(decoded.id);
        break;
      case "Trustee":
        user = await Trustee.findById(decoded.id);
        break;
      case "Devotee":
        user = await Devotee.findById(decoded.id);
        break;
      case "DocumentHandler":
      case "document_admin":
        user = await DocumentAdmin.findById(decoded.id);
        break;
      case "BranchManager":
        user = await BranchManager.findById(decoded.id);
        break;
      case "Accountant":
        user = await Accountant.findById(decoded.id);
        break;
      default:
        return res.status(401).json({ success: false, message: "Invalid role in token" });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    req.user.role = decoded.role; // Ensure role is available
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized to access this route" });
  }
};