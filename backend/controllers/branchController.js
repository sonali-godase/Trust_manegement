const Branch = require("../models/Branch");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

exports.createBranch = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole === "Admin" || userRole === "BranchManager") {
      return res.status(403).json({ success: false, message: "Not authorized to create branches." });
    }

    const { name, location, contact, description } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ success: false, message: "Name and location are required" });
    }

    let image = "";
    let imagePublicId = "";
    if (req.file) {
      const uploadRes = await uploadToCloudinary(req.file.path, "branches", { resourceType: "image" });
      if (uploadRes) {
        image = uploadRes.url;
        imagePublicId = uploadRes.publicId;
      }
    }

    const branch = new Branch({ name, location, contact, description, image, imagePublicId });
    await branch.save();
    
    res.status(201).json({ success: true, branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const userRole = req.user.role;
    const branchId = req.params.id;

    if (userRole === "Admin") {
      return res.status(403).json({ success: false, message: "Admins are read-only." });
    }

    if (userRole === "BranchManager" && (!req.user.branch || req.user.branch.toString() !== branchId)) {
      return res.status(403).json({ success: false, message: "Not authorized to update this branch." });
    }

    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    const { name, location, contact, description } = req.body;
    const updateData = { name, location, contact, description };

    if (userRole === "BranchManager" && req.body.members) {
      try {
        updateData.members = typeof req.body.members === 'string' ? JSON.parse(req.body.members) : req.body.members;
      } catch(e) {
        console.error("Failed to parse members:", e);
      }
    }

    if (req.file) {
      const oldPid = existingBranch.imagePublicId || extractPublicId(existingBranch.image);
      if (oldPid) await deleteFromCloudinary(oldPid, "image");

      const uploadRes = await uploadToCloudinary(req.file.path, "branches", { resourceType: "image" });
      if (uploadRes) {
        updateData.image = uploadRes.url;
        updateData.imagePublicId = uploadRes.publicId;
      }
    }

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    res.json({ success: true, branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole === "Admin" || userRole === "BranchManager") {
      return res.status(403).json({ success: false, message: "Not authorized to delete branches." });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    const pid = branch.imagePublicId || extractPublicId(branch.image);
    if (pid) await deleteFromCloudinary(pid, "image");

    await Branch.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
