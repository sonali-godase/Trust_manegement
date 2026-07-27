const LineageMember = require('../models/LineageMember');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinaryHelper');

// Get all members (Admin view)
exports.getAllMembers = async (req, res) => {
  try {
    const members = await LineageMember.find().populate('parentId', 'name').sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Get published members (Public view)
exports.getPublicMembers = async (req, res) => {
  try {
    const members = await LineageMember.find({ status: 'Published' }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Create a new member
exports.createMember = async (req, res) => {
  try {
    const { name, era, shortDescription, biography, status, parentId } = req.body;

    const newMemberData = {
      name,
      era,
      shortDescription,
      biography,
      status: status || 'Draft',
      parentId: parentId || null
    };

    if (req.files) {
      if (req.files.profileImage) {
        const uploadRes = await uploadToCloudinary(req.files.profileImage[0], "lineage", { resourceType: "image" });
        if (uploadRes) {
          newMemberData.profileImage = uploadRes.url;
          newMemberData.profileImagePublicId = uploadRes.publicId;
        }
      }
      if (req.files.galleryImages) {
        const urls = [];
        const pids = [];
        for (const f of req.files.galleryImages) {
          const uploadRes = await uploadToCloudinary(f, "lineage", { resourceType: "image" });
          if (uploadRes) {
            urls.push(uploadRes.url);
            pids.push(uploadRes.publicId);
          }
        }
        newMemberData.galleryImages = urls;
        newMemberData.galleryImagesPublicIds = pids;
      }
      if (req.files.documents) {
        const urls = [];
        const pids = [];
        for (const f of req.files.documents) {
          const uploadRes = await uploadToCloudinary(f, "lineage/documents", { resourceType: "auto" });
          if (uploadRes) {
            urls.push(uploadRes.url);
            pids.push(uploadRes.publicId);
          }
        }
        newMemberData.documents = urls;
        newMemberData.documentsPublicIds = pids;
      }
    }

    const newMember = new LineageMember(newMemberData);
    const savedMember = await newMember.save();
    
    res.status(201).json({ success: true, data: savedMember });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating member', error: error.message });
  }
};

// Update a member
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const existingMember = await LineageMember.findById(id);
    if (!existingMember) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const { name, era, shortDescription, biography, status, parentId } = req.body;
    const updateData = { name, era, shortDescription, biography, status, parentId: parentId || null };

    if (req.files) {
      if (req.files.profileImage) {
        const oldPid = existingMember.profileImagePublicId || extractPublicId(existingMember.profileImage);
        if (oldPid) await deleteFromCloudinary(oldPid, "image");

        const uploadRes = await uploadToCloudinary(req.files.profileImage[0], "lineage", { resourceType: "image" });
        if (uploadRes) {
          updateData.profileImage = uploadRes.url;
          updateData.profileImagePublicId = uploadRes.publicId;
        }
      }
      if (req.files.galleryImages) {
        if (existingMember.galleryImagesPublicIds && existingMember.galleryImagesPublicIds.length > 0) {
          for (const pid of existingMember.galleryImagesPublicIds) {
            await deleteFromCloudinary(pid, "image");
          }
        }
        const urls = [];
        const pids = [];
        for (const f of req.files.galleryImages) {
          const uploadRes = await uploadToCloudinary(f, "lineage", { resourceType: "image" });
          if (uploadRes) {
            urls.push(uploadRes.url);
            pids.push(uploadRes.publicId);
          }
        }
        updateData.galleryImages = urls;
        updateData.galleryImagesPublicIds = pids;
      }
      if (req.files.documents) {
        if (existingMember.documentsPublicIds && existingMember.documentsPublicIds.length > 0) {
          for (const pid of existingMember.documentsPublicIds) {
            await deleteFromCloudinary(pid, "raw");
          }
        }
        const urls = [];
        const pids = [];
        for (const f of req.files.documents) {
          const uploadRes = await uploadToCloudinary(f, "lineage/documents", { resourceType: "auto" });
          if (uploadRes) {
            urls.push(uploadRes.url);
            pids.push(uploadRes.publicId);
          }
        }
        updateData.documents = urls;
        updateData.documentsPublicIds = pids;
      }
    }

    const updatedMember = await LineageMember.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    res.status(200).json({ success: true, data: updatedMember });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating member', error: error.message });
  }
};

// Delete a member
exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await LineageMember.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const profilePid = member.profileImagePublicId || extractPublicId(member.profileImage);
    if (profilePid) await deleteFromCloudinary(profilePid, "image");

    if (member.galleryImagesPublicIds && member.galleryImagesPublicIds.length > 0) {
      for (const pid of member.galleryImagesPublicIds) {
        await deleteFromCloudinary(pid, "image");
      }
    }

    if (member.documentsPublicIds && member.documentsPublicIds.length > 0) {
      for (const pid of member.documentsPublicIds) {
        await deleteFromCloudinary(pid, "raw");
      }
    }

    await LineageMember.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting member', error: error.message });
  }
};

// Update status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedMember = await LineageMember.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
    
    if (!updatedMember) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.status(200).json({ success: true, data: updatedMember });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
  }
};
