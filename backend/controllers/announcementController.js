const Announcement = require("../models/Announcement");
const AnnouncementRecipient = require("../models/AnnouncementRecipient");
const Admin = require('../models/Admin');
const Trustee = require('../models/Trustee');
const BranchManager = require('../models/BranchManager');
const Accountant = require('../models/Accountant');
const DocumentAdmin = require('../models/DocumentAdmin');
const Devotee = require('../models/Devotee');
const { sendAnnouncementEmail } = require('../services/mailService');


const getPanelName = (role) => {
  switch (role) {
    case 'Admin': return 'Main Admin Panel';
    case 'Trustee': return 'Trust Panel';
    case 'BranchManager': return 'Branch Manager Panel';
    case 'DocumentAdmin':
    case 'DocumentHandler':
    case 'document_admin': return 'Document Handler Panel';
    case 'Accountant': return 'Accountant Panel';
    default: return 'System Panel';
  }
};

// Management Endpoint - For Admins, Branch Managers, Trustees to see announcements they manage/created
exports.getAllAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === 'Admin') {
      // Admin sees all announcements
    } else {
      let targetConditions = [];

      if (user.role === 'BranchManager') {
        const bId = user.branchId || user.branch?._id || user.branch;
        targetConditions = [
          { audienceType: 'All Branches' },
          { audienceType: 'All Users' },
          { targetRoles: 'BranchManager' },
          { targetBranches: bId },
          { targetUsers: user._id }
        ];
      } else if (user.role === 'Trustee') {
        targetConditions = [
          { audienceType: 'All Trust Members' },
          { audienceType: 'All Users' },
          { targetRoles: user.systemRole || 'Trust Member' },
          { targetUsers: user._id }
        ];
      } else if (user.role === 'Accountant' || user.role === 'DocumentHandler' || user.role === 'document_admin') {
        const roleStr = (user.role === 'document_admin' || user.role === 'DocumentHandler') ? 'DocumentAdmin' : user.role;
        targetConditions = [
          { audienceType: 'All Users' },
          { targetRoles: roleStr },
          { targetUsers: user._id }
        ];
      } else {
        return res.status(403).json({ success: false, message: "Unauthorized to manage announcements" });
      }

      query = {
        $or: [
          { createdBy: user._id }
        ]
      };

      if (targetConditions.length > 0) {
        query.$or.push({
          status: 'Published',
          $or: targetConditions
        });
      }
    }

    // Exclude announcements that the current user has dismissed from their view
    query.dismissedBy = { $ne: user._id };

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email role profilePhoto')
      .sort({ createdAt: -1 })
      .lean();
    
    // Attach read counts
    const announcementIds = announcements.map(a => a._id);
    const readReceipts = await AnnouncementRecipient.find({
      announcementId: { $in: announcementIds },
      readStatus: true
    });
    
    const readCounts = {};
    readReceipts.forEach(r => {
      readCounts[r.announcementId] = (readCounts[r.announcementId] || 0) + 1;
    });

    const data = announcements.map(a => ({
      ...a,
      totalRead: readCounts[a._id] || 0
    }));
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const user = req.user;
    if (user.role === 'BranchManager') {
      const bId = user.branchId || user.branch?._id || user.branch;
      if (!req.body.audienceType || req.body.audienceType.length === 0) {
        req.body.audienceType = ['All Branches'];
      }
      if (bId && (!req.body.targetBranches || req.body.targetBranches.length === 0)) {
        req.body.targetBranches = [bId];
      }
    }
    req.body.createdBy = user._id;
    req.body.createdByModel = (user.role === 'document_admin' || user.role === 'DocumentHandler') ? 'DocumentAdmin' : user.role;
    req.body.createdByRole = user.role;
    req.body.createdByPanel = getPanelName(user.role);
    
    const announcement = new Announcement(req.body);
    await announcement.save();
    
    let emailStatus = 'Emails not enabled.';
    if (announcement.emailIntegration) {
      try {
        const emails = new Set();
        const addEmails = (docs) => {
          docs.forEach(doc => { if (doc.email) emails.add(doc.email); });
        };

        const { audienceType = [], targetBranches = [], targetRoles = [], targetUsers = [] } = announcement;
        
        if (audienceType.includes('All Users')) {
          addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
          addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
          addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
          addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
          addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
          addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
        } else {
          if (audienceType.includes('All Devotees')) addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
          if (audienceType.includes('All Trust Members')) addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
          if (audienceType.includes('All Branches')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
          if (targetBranches && targetBranches.length > 0) addEmails(await BranchManager.find({ branchId: { $in: targetBranches }, email: { $exists: true, $ne: '' } }));
          if (targetRoles && targetRoles.length > 0) {
            addEmails(await Trustee.find({ systemRole: { $in: targetRoles }, email: { $exists: true, $ne: '' } }));
            if (targetRoles.includes('Admin')) addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
            if (targetRoles.includes('BranchManager')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            if (targetRoles.includes('Accountant')) addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
            if (targetRoles.includes('DocumentAdmin')) addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
          }
          if (targetUsers && targetUsers.length > 0) {
            addEmails(await Trustee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            addEmails(await Admin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            addEmails(await BranchManager.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            addEmails(await Accountant.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            addEmails(await DocumentAdmin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            addEmails(await Devotee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
          }
        }

        const emailArray = Array.from(emails);
        if (emailArray.length > 0) {
          console.log(`[Announcement] Sending ${emailArray.length} emails...`);
          
          await Promise.allSettled(
            emailArray.map(email => 
              sendAnnouncementEmail(
                email,
                'User', 
                announcement.title,
                announcement.message,
                req.user.name,
                req.user.email
              )
            )
          );
          emailStatus = 'Emails dispatched successfully.';
        }
      } catch (err) {
        console.error('[Announcement Email Error]', err);
        emailStatus = `Email sending failed: ${err.message}`;
      }
    }

    return res.status(201).json({ success: true, emailStatus, data: announcement });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    const creatorId = announcement.createdBy?._id || announcement.createdBy;
    const isCreator = creatorId && String(creatorId) === String(req.user._id);

    if (!isCreator) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Only the original creator of an announcement can edit it.' 
      });
    }

    Object.assign(announcement, req.body);
    await announcement.save();
    
    let emailStatus = 'Emails not enabled.';
    if (announcement.emailIntegration) {
        try {
          const emails = new Set();
          const addEmails = (docs) => {
            docs.forEach(doc => { if (doc.email) emails.add(doc.email); });
          };

          const { audienceType = [], targetBranches = [], targetRoles = [], targetUsers = [] } = announcement;
          
          if (audienceType.includes('All Users')) {
            addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
          } else {
            if (audienceType.includes('All Devotees')) addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
            if (audienceType.includes('All Trust Members')) addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
            if (audienceType.includes('All Branches')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            if (targetBranches && targetBranches.length > 0) addEmails(await BranchManager.find({ branchId: { $in: targetBranches }, email: { $exists: true, $ne: '' } }));
            if (targetRoles && targetRoles.length > 0) {
              addEmails(await Trustee.find({ systemRole: { $in: targetRoles }, email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('Admin')) addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('BranchManager')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('Accountant')) addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('DocumentAdmin')) addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
            }
            if (targetUsers && targetUsers.length > 0) {
              addEmails(await Trustee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Admin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await BranchManager.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Accountant.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await DocumentAdmin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Devotee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            }
          }

          const emailArray = Array.from(emails);
          if (emailArray.length > 0) {
            console.log(`[Announcement] Sending ${emailArray.length} emails...`);
            await sendAnnouncementEmail(emailArray, req.user?.name || 'System Admin', announcement.title, announcement.message);
            emailStatus = 'Emails dispatched successfully.';
          }
        } catch (err) {
          console.error('[Announcement Email Error]', err);
          emailStatus = `Email sending failed: ${err.message}`;
        }
    }
    
    return res.status(200).json({ success: true, emailStatus, data: announcement });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement not found" });

    const creatorId = announcement.createdBy?._id || announcement.createdBy;
    const isCreator = creatorId && String(creatorId) === String(req.user._id);

    // Only the original creator can permanently delete the announcement from the system
    if (!isCreator) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: Only the original creator can permanently delete this announcement from the system." 
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    await AnnouncementRecipient.deleteMany({ announcementId: req.params.id });
    
    return res.status(200).json({ success: true, message: "Announcement permanently deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// User Notifications Endpoint - For ANY user to fetch announcements they should see
exports.getMyNotifications = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

    let conditions = [{ audienceType: 'All Users' }];

    if (user.role === 'Devotee') {
      conditions.push({ audienceType: 'All Devotees' });
    } else if (user.role === 'Trustee') {
      conditions.push({ audienceType: 'All Trust Members' });
      if (user.systemRole) {
        conditions.push({ targetRoles: user.systemRole });
      }
    } else if (user.role === 'BranchManager') {
      conditions.push({ audienceType: 'All Branches' });
      conditions.push({ targetRoles: 'BranchManager' });
      const bId = user.branchId || user.branch?._id || user.branch;
      if (bId) {
        conditions.push({ targetBranches: bId });
      }
    } else if (user.role === 'Accountant') {
      conditions.push({ targetRoles: 'Accountant' });
    } else if (user.role === 'DocumentAdmin' || user.role === 'document_admin' || user.role === 'DocumentHandler') {
      conditions.push({ targetRoles: 'DocumentAdmin' });
    }
    
    // Specific user targeting applies to anyone
    conditions.push({ targetUsers: user._id });

    const query = user.role === 'Admin' 
      ? { status: 'Published' } 
      : { status: 'Published', $or: conditions };

    // Find announcements matching the conditions
    const announcements = await Announcement.find(query).sort({ publishDate: -1, createdAt: -1 });

    // Fetch read status for these announcements
    const announcementIds = announcements.map(a => a._id);
    const readReceipts = await AnnouncementRecipient.find({
      userId: user._id,
      announcementId: { $in: announcementIds }
    });

    const readSet = new Set();
    const dismissedSet = new Set();
    readReceipts.forEach(r => {
      if (r.readStatus) readSet.add(r.announcementId.toString());
      if (r.isDismissed) dismissedSet.add(r.announcementId.toString());
    });

    const data = announcements
      .filter(a => !dismissedSet.has(a._id.toString()))
      .map(a => {
        const annObj = a.toObject();
        annObj.isRead = readSet.has(a._id.toString());
        return annObj;
      });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const receipt = await AnnouncementRecipient.findOneAndUpdate(
      { announcementId: id, userId: user._id },
      { readStatus: true, readTime: new Date(), deliveryStatus: 'Delivered' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const receipt = await AnnouncementRecipient.findOneAndUpdate(
      { announcementId: id, userId: user._id },
      { isDismissed: true },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Also update dismissedBy on Announcement document so it is hidden from the user's dashboard view
    await Announcement.findByIdAndUpdate(id, {
      $addToSet: { dismissedBy: user._id }
    });

    res.status(200).json({ success: true, message: "Announcement removed from your view", data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const readReceipts = await AnnouncementRecipient.find({ announcementId: id });
    const totalRead = readReceipts.filter(r => r.readStatus).length;
    res.status(200).json({ success: true, data: { totalRead, readReceipts } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
