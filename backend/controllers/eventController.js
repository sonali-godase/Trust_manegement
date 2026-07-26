const Event = require("../models/Event");
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require("../utils/cloudinaryHelper");
// Removed Cloudinary as per strict requirement for physical uploads

// Status is now manually managed by Admin, no dynamic override needed.

const processEvents = (events) => {
  return events.map(e => e.toObject ? e.toObject() : e);
};

const processSingleEvent = (event) => {
  if (!event) return null;
  return event.toObject ? event.toObject() : event;
};

// ADMIN: Get all events (with filters)
exports.getAllEventsAdmin = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = {};
    if (req.query.branchId) query.branch = req.query.branchId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).populate('branch', 'name location').sort({ createdAt: -1 });
    const processedEvents = processEvents(events);
    
    res.status(200).json({ success: true, count: processedEvents.length, data: processedEvents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN: Get single event by ID
exports.getEventByIdAdmin = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('branch', 'name location');
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.status(200).json({ success: true, data: processSingleEvent(event) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN: Create Event
exports.createEvent = async (req, res) => {
  try {
    const eventData = { ...req.body };
    
    // Process files if available
    if (req.files) {
      if (req.files['featuredImage']) {
        const uploadRes = await uploadToCloudinary(req.files['featuredImage'][0].path, "events/images", { resourceType: "image" });
        if (uploadRes) {
          eventData.featuredImage = uploadRes.url;
          eventData.featuredImagePublicId = uploadRes.publicId;
        }
      }
      
      if (req.files['galleryImages']) {
        const galleryUrls = [];
        const galleryPublicIds = [];
        for (const file of req.files['galleryImages']) {
          const uploadRes = await uploadToCloudinary(file.path, "events/images", { resourceType: "image" });
          if (uploadRes) {
            galleryUrls.push(uploadRes.url);
            galleryPublicIds.push(uploadRes.publicId);
          }
        }
        eventData.galleryImages = galleryUrls;
        eventData.galleryImagesPublicIds = galleryPublicIds;
      }

      if (req.files['videoFile']) {
        const uploadRes = await uploadToCloudinary(req.files['videoFile'][0].path, "events/videos", { resourceType: "video" });
        if (uploadRes) {
          eventData.videoFile = uploadRes.url;
          eventData.videoFilePublicId = uploadRes.publicId;
        }
      }
    }
    
    // Default values mapping from frontend to backend if needed
    if (eventData.tags && typeof eventData.tags === 'string') {
       eventData.tags = eventData.tags.split(',').map(tag => tag.trim());
    }

    if (req.user && req.user.role === 'BranchManager') {
      const userBranch = req.user.branch?._id || req.user.branch;
      if (userBranch) {
        eventData.branch = userBranch;
      }
    }

    const event = new Event(eventData);
    await event.save();
    
    const processed = processSingleEvent(event);
    if(req.app.get('io')) req.app.get('io').emit('event_created', processed);
    
    res.status(201).json({ success: true, data: processed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ADMIN: Update Event
exports.updateEvent = async (req, res) => {
  try {
    const eventData = { ...req.body };
    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent) return res.status(404).json({ success: false, message: "Event not found" });

    // Process files if available
    if (req.files) {
      if (req.files['featuredImage']) {
        const oldPublicId = existingEvent.featuredImagePublicId || extractPublicId(existingEvent.featuredImage);
        if (oldPublicId) {
          await deleteFromCloudinary(oldPublicId, "image");
        }
        const uploadRes = await uploadToCloudinary(req.files['featuredImage'][0].path, "events/images", { resourceType: "image" });
        if (uploadRes) {
          eventData.featuredImage = uploadRes.url;
          eventData.featuredImagePublicId = uploadRes.publicId;
        }
      }
      
      if (req.files['galleryImages']) {
        if (existingEvent.galleryImagesPublicIds && existingEvent.galleryImagesPublicIds.length > 0) {
          for (const pid of existingEvent.galleryImagesPublicIds) {
            await deleteFromCloudinary(pid, "image");
          }
        }
        const galleryUrls = [];
        const galleryPublicIds = [];
        for (const file of req.files['galleryImages']) {
          const uploadRes = await uploadToCloudinary(file.path, "events/images", { resourceType: "image" });
          if (uploadRes) {
            galleryUrls.push(uploadRes.url);
            galleryPublicIds.push(uploadRes.publicId);
          }
        }
        eventData.galleryImages = galleryUrls;
        eventData.galleryImagesPublicIds = galleryPublicIds;
      }

      if (req.files['videoFile']) {
        const oldPublicId = existingEvent.videoFilePublicId || extractPublicId(existingEvent.videoFile);
        if (oldPublicId) {
          await deleteFromCloudinary(oldPublicId, "video");
        }
        const uploadRes = await uploadToCloudinary(req.files['videoFile'][0].path, "events/videos", { resourceType: "video" });
        if (uploadRes) {
          eventData.videoFile = uploadRes.url;
          eventData.videoFilePublicId = uploadRes.publicId;
        }
      }
    }
    
    if (eventData.tags && typeof eventData.tags === 'string') {
       eventData.tags = eventData.tags.split(',').map(tag => tag.trim());
    }

    if (req.user && req.user.role === 'BranchManager') {
      const userBranchStr = (req.user.branch?._id || req.user.branch || '').toString();
      const eventBranchStr = (existingEvent.branch?._id || existingEvent.branch || '').toString();
      if (eventBranchStr !== userBranchStr) {
        return res.status(403).json({ success: false, message: "Not authorized to update events for other branches." });
      }
      eventData.branch = userBranchStr;
    }

    const event = await Event.findByIdAndUpdate(req.params.id, eventData, { returnDocument: 'after', runValidators: true });
    
    const processed = processSingleEvent(event);
    if(req.app.get('io')) req.app.get('io').emit('event_updated', processed);
    
    res.status(200).json({ success: true, data: processed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ADMIN: Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent) return res.status(404).json({ success: false, message: "Event not found" });

    if (req.user && req.user.role === 'BranchManager') {
      const userBranchStr = (req.user.branch?._id || req.user.branch || '').toString();
      const eventBranchStr = (existingEvent.branch?._id || existingEvent.branch || '').toString();
      if (eventBranchStr !== userBranchStr) {
        return res.status(403).json({ success: false, message: "Not authorized to delete events for other branches." });
      }
    }

    // Delete Cloudinary assets
    const featuredPid = existingEvent.featuredImagePublicId || extractPublicId(existingEvent.featuredImage);
    if (featuredPid) await deleteFromCloudinary(featuredPid, "image");

    if (existingEvent.galleryImagesPublicIds && existingEvent.galleryImagesPublicIds.length > 0) {
      for (const pid of existingEvent.galleryImagesPublicIds) {
        await deleteFromCloudinary(pid, "image");
      }
    }

    const videoPid = existingEvent.videoFilePublicId || extractPublicId(existingEvent.videoFile);
    if (videoPid) await deleteFromCloudinary(videoPid, "video");

    await Event.findByIdAndDelete(req.params.id);
    
    if(req.app.get('io')) req.app.get('io').emit('event_deleted', req.params.id);
    
    res.status(200).json({ success: true, message: "Event deleted successfully" });
    
    if(req.app.get('io')) req.app.get('io').emit('event_deleted', req.params.id);
    
    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN: Toggle Publish
exports.togglePublish = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    
    event.isPublished = !event.isPublished;
    await event.save();
    
    const processed = processSingleEvent(event);
    if(req.app.get('io')) req.app.get('io').emit('event_updated', processed);
    
    res.status(200).json({ success: true, message: `Event ${event.isPublished ? 'published' : 'unpublished'} successfully`, data: processed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN: Toggle Featured
exports.toggleFeatured = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    
    event.isFeatured = !event.isFeatured;
    await event.save();
    
    const processed = processSingleEvent(event);
    if(req.app.get('io')) req.app.get('io').emit('event_updated', processed);
    
    res.status(200).json({ success: true, message: `Event marked as ${event.isFeatured ? 'featured' : 'unfeatured'}`, data: processed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// USER: Get Published Events (with optional filters)
exports.getPublishedEvents = async (req, res) => {
  try {
    const { search, limit = 10, page = 1, branchId, filterStatus } = req.query;
    let query = { isPublished: true };
    
    if (branchId) query.branch = branchId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sortOption = { eventDate: 1 };

    if (filterStatus === 'upcoming') {
      const dateCondition = [
        { eventDate: { $gte: today } },
        { eventEndDate: { $gte: today } }
      ];
      if (query.$or) {
         query.$and = [{ $or: query.$or }, { $or: dateCondition }];
         delete query.$or;
      } else {
         query.$or = dateCondition;
      }
      sortOption = { eventDate: 1 };
    } else if (filterStatus === 'past') {
      const dateCondition = [
        { eventDate: { $lt: today }, eventEndDate: { $exists: false } },
        { eventEndDate: { $lt: today } }
      ];
      if (query.$or) {
         query.$and = [{ $or: query.$or }, { $or: dateCondition }];
         delete query.$or;
      } else {
         query.$or = dateCondition;
      }
      sortOption = { eventDate: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
                              .populate('branch', 'name location')
                              .sort(sortOption)
                              .skip(skip)
                              .limit(parseInt(limit));
                              
    const processedEvents = processEvents(events);
    
    res.status(200).json({ 
      success: true, 
      count: processedEvents.length, 
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: processedEvents 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// USER: Get Featured Events
exports.getFeaturedEvents = async (req, res) => {
  try {
    const events = await Event.find({ isPublished: true, isFeatured: true }).populate('branch', 'name').sort({ eventDate: 1 }).limit(3);
    res.status(200).json({ success: true, data: processEvents(events) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// USER: Get Event by Slug
exports.getEventBySlug = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { slug: req.params.slug, isPublished: true },
      { $inc: { totalViews: 1, totalVisitors: 1 } }, // Tracking both for now
      { returnDocument: 'after' }
    ).populate('branch', 'name location');
    
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    
    const processed = processSingleEvent(event);
    if(req.app.get('io')) req.app.get('io').emit('event_viewed', processed._id);
    
    res.status(200).json({ success: true, data: processed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
