const MathHistory = require('../models/MathHistory');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinaryHelper');

// Get all records (Admin/Trustee view)
exports.getAllRecords = async (req, res) => {
  try {
    const records = await MathHistory.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Get published records (Public view)
exports.getPublicRecords = async (req, res) => {
  try {
    const records = await MathHistory.find({ status: 'Published' }).sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Create a new record
exports.createRecord = async (req, res) => {
  try {
    const { title, era, content, category, status, order } = req.body;
    let media = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let type = 'document';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype.startsWith('video/')) type = 'video';
        
        const uploadRes = await uploadToCloudinary(file, 'math_history', { resourceType: 'auto' });
        if (uploadRes) {
          media.push({
            url: uploadRes.url,
            type,
            publicId: uploadRes.publicId
          });
        }
      }
    }

    const newRecord = new MathHistory({
      title,
      era,
      content,
      category: category || 'Origin',
      status: status || 'Draft',
      order: order ? parseInt(order) : 0,
      media
    });

    const savedRecord = await newRecord.save();
    res.status(201).json({ success: true, data: savedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating record', error: error.message });
  }
};

// Update a record
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, era, content, category, status, order } = req.body;

    const existingRecord = await MathHistory.findById(id);
    if (!existingRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    let media = existingRecord.media || [];

    if (req.files && req.files.length > 0) {
      const newMedia = [];
      for (const file of req.files) {
        let type = 'document';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype.startsWith('video/')) type = 'video';
        
        const uploadRes = await uploadToCloudinary(file, 'math_history', { resourceType: 'auto' });
        if (uploadRes) {
          newMedia.push({
            url: uploadRes.url,
            type,
            publicId: uploadRes.publicId
          });
        }
      }
      if (newMedia.length > 0) {
        media = [...media, ...newMedia];
      }
    }

    const updateData = {
      title,
      era,
      content,
      category,
      status,
      order: order !== undefined ? parseInt(order) : existingRecord.order,
      media
    };

    const updatedRecord = await MathHistory.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });

    res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating record', error: error.message });
  }
};

// Delete a record
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await MathHistory.findByIdAndDelete(id);
    
    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting record', error: error.message });
  }
};

// Update status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedRecord = await MathHistory.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
  }
};
