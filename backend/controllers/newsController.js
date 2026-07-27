const News = require("../models/News");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");

// Helper to filter active, published and unexpired news
const getActiveNewsQuery = (additional = {}) => {
  const now = new Date();
  return {
    status: 'Active',
    publishDate: { $lte: now },
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: now } }
    ],
    ...additional
  };
};

// @desc    Get all active news (Public Gallery News tab)
// @route   GET /api/news
// @access  Public
exports.getPublicNews = async (req, res) => {
  try {
    const { search, category, branchId, limit = 10, page = 1 } = req.query;
    const query = getActiveNewsQuery();

    if (category) {
      query.category = category;
    }

    if (branchId) {
      query.$or = [
        { branchSelection: 'All Branches' },
        { branch: branchId }
      ];
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await News.countDocuments(query);
    const news = await News.find(query)
      .populate('branch', 'name location')
      .sort({ publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: news.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: news
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get news for homepage slider
// @route   GET /api/news/slider
// @access  Public
exports.getSliderNews = async (req, res) => {
  try {
    const query = getActiveNewsQuery({ showOnSlider: true });
    const news = await News.find(query)
      .populate('branch', 'name location')
      .sort({ displayOrder: 1, publishDate: -1 });

    res.status(200).json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get news by ID
// @route   GET /api/news/:id
// @access  Public
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id).populate('branch', 'name location');
    if (!news) {
      return res.status(404).json({ success: false, message: "News item not found" });
    }
    
    // If not active/published/expired, restrict to logged in managers
    const now = new Date();
    const isPubliclyAvailable = 
      news.status === 'Active' && 
      new Date(news.publishDate) <= now && 
      (!news.expiryDate || new Date(news.expiryDate) >= now);

    if (!isPubliclyAvailable && !req.headers.authorization) {
      return res.status(403).json({ success: false, message: "Access denied. News is draft or expired" });
    }

    res.status(200).json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get news for Admin Dashboards
// @route   GET /api/news/admin
// @access  Private (Admin/Trustee/BranchManager)
exports.getAllNewsAdmin = async (req, res) => {
  try {
    const { search, category, branchId } = req.query;
    const query = {};

    if (req.user.role === 'BranchManager') {
      query.branchSelection = 'Specific Branch';
      query.branch = req.user.branch;
    } else if (branchId) {
      query.branch = branchId;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
      if (query.$and) {
        query.$and.push({ $or: searchOr });
      } else {
        query.$or = searchOr;
      }
    }

    const news = await News.find(query)
      .populate('branch', 'name location')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create News
// @route   POST /api/news
// @access  Private (Admin/Trustee/BranchManager)
exports.createNews = async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin role is read-only for news" });
    }
    const newsData = { ...req.body };

    // Clean up empty fields that cause Mongoose cast errors
    if (newsData.branch === '' || newsData.branch === 'null' || newsData.branchSelection === 'All Branches') {
      newsData.branch = null;
    }
    if (newsData.expiryDate === '' || newsData.expiryDate === 'null') {
      newsData.expiryDate = null;
    }

    // RBAC validation & overrides
    if (req.user.role === 'BranchManager') {
      newsData.branchSelection = 'Specific Branch';
      newsData.branch = req.user.branch;
    }

    newsData.createdBy = req.user._id;
    newsData.createdByModel = req.user.role;

    // Handle uploaded files
    if (req.files) {
      if (req.files['coverImage'] && req.files['coverImage'][0]) {
        const uploadRes = await uploadToCloudinary(req.files['coverImage'][0], "news/images", { resourceType: "image" });
        if (uploadRes) {
          newsData.coverImage = uploadRes.url;
          newsData.coverImagePublicId = uploadRes.publicId;
        }
      }
      
      if (req.files['galleryImages'] && req.files['galleryImages'].length > 0) {
        const galleryUrls = [];
        const galleryPublicIds = [];
        for (const file of req.files['galleryImages']) {
          const uploadRes = await uploadToCloudinary(file, "news/images", { resourceType: "image" });
          if (uploadRes) {
            galleryUrls.push(uploadRes.url);
            galleryPublicIds.push(uploadRes.publicId);
          }
        }
        newsData.galleryImages = galleryUrls;
        newsData.galleryImagesPublicIds = galleryPublicIds;
      }
    }

    if (!newsData.coverImage) {
      return res.status(400).json({ success: false, message: "Cover image is required" });
    }

    const news = new News(newsData);
    await news.save();

    res.status(201).json({ success: true, data: news });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update News
// @route   PUT /api/news/:id
// @access  Private (Admin/Trustee/BranchManager)
exports.updateNews = async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin role is read-only for news" });
    }
    let news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: "News item not found" });
    }

    // Auth validation
    if (req.user.role === 'BranchManager') {
      if (!news.branch || news.branch.toString() !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized. You do not manage this news" });
      }
      req.body.branchSelection = 'Specific Branch';
      req.body.branch = req.user.branch;
    } else if (req.user.role === 'Trustee') {
      const userPerms = req.user.permissions || [];
      const hasPermission = userPerms.some(p => 
        (p.module === 'News' || p.module === 'Gallery') && p.level === 'Manage'
      );
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: "Unauthorized. Manage permission required for News or Gallery" });
      }
    }

    const newsData = { ...req.body };

    // Clean up empty fields that cause Mongoose cast errors
    if (newsData.branch === '' || newsData.branch === 'null' || newsData.branchSelection === 'All Branches') {
      newsData.branch = null;
    }
    if (newsData.expiryDate === '' || newsData.expiryDate === 'null') {
      newsData.expiryDate = null;
    }

    // Handle retained gallery images
    let retainedUrls = [];
    if (newsData.retainedGalleryImages) {
      try {
        retainedUrls = typeof newsData.retainedGalleryImages === 'string'
          ? JSON.parse(newsData.retainedGalleryImages)
          : newsData.retainedGalleryImages;
      } catch (e) {}
      delete newsData.retainedGalleryImages;
    } else {
      retainedUrls = news.galleryImages || [];
    }

    // Handle files upload
    if (req.files) {
      if (req.files['coverImage'] && req.files['coverImage'][0]) {
        const oldPid = news.coverImagePublicId || extractPublicId(news.coverImage);
        if (oldPid) await deleteFromCloudinary(oldPid, "image");

        const uploadRes = await uploadToCloudinary(req.files['coverImage'][0], "news/images", { resourceType: "image" });
        if (uploadRes) {
          newsData.coverImage = uploadRes.url;
          newsData.coverImagePublicId = uploadRes.publicId;
        }
      }
      
      const galleryUrls = [...retainedUrls];
      const galleryPublicIds = [];

      // Keep existing public IDs that are still in retainedUrls
      if (news.galleryImages && news.galleryImagesPublicIds) {
        news.galleryImages.forEach((url, idx) => {
          if (retainedUrls.includes(url) && news.galleryImagesPublicIds[idx]) {
            galleryPublicIds.push(news.galleryImagesPublicIds[idx]);
          } else if (!retainedUrls.includes(url) && news.galleryImagesPublicIds[idx]) {
            deleteFromCloudinary(news.galleryImagesPublicIds[idx], "image");
          }
        });
      }

      if (req.files['galleryImages'] && req.files['galleryImages'].length > 0) {
        for (const file of req.files['galleryImages']) {
          const uploadRes = await uploadToCloudinary(file, "news/images", { resourceType: "image" });
          if (uploadRes) {
            galleryUrls.push(uploadRes.url);
            galleryPublicIds.push(uploadRes.publicId);
          }
        }
      }
      newsData.galleryImages = galleryUrls;
      newsData.galleryImagesPublicIds = galleryPublicIds;
    } else {
      newsData.galleryImages = retainedUrls;
    }

    news = await News.findByIdAndUpdate(req.params.id, newsData, { returnDocument: 'after', runValidators: true });

    res.status(200).json({ success: true, data: news });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete News
// @route   DELETE /api/news/:id
// @access  Private (Admin/Trustee/BranchManager)
exports.deleteNews = async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin role is read-only for news" });
    }
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: "News item not found" });
    }

    // Auth validation
    if (req.user.role === 'BranchManager') {
      if (!news.branch || news.branch.toString() !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized. You do not manage this news" });
      }
    } else if (req.user.role === 'Trustee') {
      const userPerms = req.user.permissions || [];
      const hasPermission = userPerms.some(p => 
        (p.module === 'News' || p.module === 'Gallery') && p.level === 'Manage'
      );
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: "Unauthorized. Manage permission required for News or Gallery" });
      }
    }

    // Delete Cloudinary assets
    const coverPid = news.coverImagePublicId || extractPublicId(news.coverImage);
    if (coverPid) await deleteFromCloudinary(coverPid, "image");

    if (news.galleryImagesPublicIds && news.galleryImagesPublicIds.length > 0) {
      for (const pid of news.galleryImagesPublicIds) {
        await deleteFromCloudinary(pid, "image");
      }
    }

    await News.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: "News item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
