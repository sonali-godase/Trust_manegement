const ReceiptArchive = require("../models/ReceiptArchive");
const Donation = require("../models/Donation");
const { issueReceipt } = require("../utils/receiptEngine");

// Create an ad-hoc Notice
exports.generateNotice = async (req, res) => {
  try {
    const { subject, noticeContent, targetBranches, outwardNo, date, to } = req.body;
    
    // In a real application, you might save an `Announcement` model first,
    // but here we just generate a receipt log directly for the notice.
    const dynamicData = {
      subject: subject,
      noticeContent: noticeContent,
      to: to,
      outwardNo: outwardNo || 'NOT-' + Date.now(),
      date: date || new Date().toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' }),
      authorName: req.user.name || "Admin",
      branchName: req.user.branch ? "Branch" : "Main Trust"
    };

    const archive = await issueReceipt({
      category: 'Notice',
      year: new Date().getFullYear(),
      dynamicData,
      generatedBy: req.user._id,
      generatedByModel: req.user.role || 'Trustee' // Fallback to Trustee if undefined
    });

    res.status(201).json({ success: true, data: archive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all receipts (with role-based filtering)
exports.getReceipts = async (req, res) => {
  try {
    const { category, branchId, search, year, month } = req.query;
    
    let query = {};
    
    if (year) {
      const y = parseInt(year);
      if (month) {
        const m = parseInt(month) - 1; // 0-indexed month for Date
        query.createdAt = { $gte: new Date(y, m, 1), $lt: new Date(y, m + 1, 1) };
      } else {
        query.createdAt = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
      }
    }

    // Role Based Filtering
    if (req.user.role === "BranchManager") {
      // Can only see their branch receipts, and only specific categories
      query.branchId = req.user.branch;
      query.category = { $in: ['Branch Donation', 'Annadan', 'Prasad'] };
    } else if (req.user.role === "Accountant") {
      // Can only see financial receipts
      query.category = { $in: ['Payment', 'Expense', 'Jama Pavti', 'Dengi Pavti', 'Branch Pavti'] };
    } else if (req.user.role === "Trustee" || req.user.role === "Admin") {
      // Trustee and Admin can see everything natively (or filter as they choose)
    } else if (req.user.role === "Devotee") {
       // Only their own receipts
       query.generatedBy = req.user._id; 
    }

    if (category && category !== "All") {
       query.category = category;
    }
    
    if (branchId && branchId !== "All" && req.user.role !== "BranchManager") {
       query.branchId = branchId;
    }

    if (search) {
       query.receiptNumber = { $regex: search, $options: "i" };
    }

    const donationCategories = ["Jama Pavti", "Dengi Pavti", "Branch Pavti", "Donation"];

    // Prevent fetching duplicates from ReceiptArchive since we fetch Donations natively
    let receipts = [];
    let archiveQuery = { ...query };
    
    // Always exclude donationCategories from archiveQuery to prevent duplicates (since Donations are fetched directly)
    if (archiveQuery.category && typeof archiveQuery.category === 'object') {
      archiveQuery.category = { ...archiveQuery.category };
    }
    
    if (!archiveQuery.category || archiveQuery.category === "All") {
      archiveQuery.category = { $nin: donationCategories };
    } else if (typeof archiveQuery.category === 'string' && donationCategories.includes(archiveQuery.category)) {
      // If the exact category is a donation category, don't query ReceiptArchive at all
      archiveQuery = null; 
    } else if (archiveQuery.category.$in) {
      archiveQuery.category.$in = archiveQuery.category.$in.filter(c => !donationCategories.includes(c));
      if (archiveQuery.category.$in.length === 0) archiveQuery = null;
    } else if (archiveQuery.category.$nin) {
      archiveQuery.category.$nin = [...archiveQuery.category.$nin, ...donationCategories];
    }
    
    if (archiveQuery) {
      receipts = await ReceiptArchive.find(archiveQuery)
        .populate('generatedBy', 'name fullName displayName')
        .populate('branchId', 'name')
        .sort({ createdAt: -1 })
        .lean();
    }

    let mergedReceipts = [...receipts];

    // Fetch approved donations if Category filter allows it
    const effectiveCategory = query.category || category;
    const isDonationCategory = !effectiveCategory || effectiveCategory === "All" || (typeof effectiveCategory === 'string' && donationCategories.includes(effectiveCategory)) || (effectiveCategory.$in && effectiveCategory.$in.some(c => donationCategories.includes(c)));
    
    if (isDonationCategory) {
      const donationQuery = { status: "APPROVED", receiptNumber: { $exists: true } };
      
      if (year) {
        const y = parseInt(year);
        if (month) {
          const m = parseInt(month) - 1;
          donationQuery.approvalDate = { $gte: new Date(y, m, 1), $lt: new Date(y, m + 1, 1) };
        } else {
          donationQuery.approvalDate = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
        }
      }
      
      // Filter by specific donation category if selected
      if (typeof effectiveCategory === 'string' && effectiveCategory !== "All" && effectiveCategory !== "Donation") {
        if (effectiveCategory === "Jama Pavti") donationQuery.donationType = "jama_pavti";
        if (effectiveCategory === "Dengi Pavti") donationQuery.donationType = "dengi_pavti";
        if (effectiveCategory === "Branch Pavti") donationQuery.donationType = "shakha_pavti";
      } else if (effectiveCategory && effectiveCategory.$in) {
        const dTypes = [];
        if (effectiveCategory.$in.includes("Jama Pavti")) dTypes.push("jama_pavti");
        if (effectiveCategory.$in.includes("Dengi Pavti")) dTypes.push("dengi_pavti");
        if (effectiveCategory.$in.includes("Branch Pavti")) dTypes.push("shakha_pavti");
        if (dTypes.length > 0 && !effectiveCategory.$in.includes("Donation")) {
           donationQuery.$or = [
             { donationType: { $in: dTypes } },
             { donationType: { $exists: false } },
             { donationType: null }
           ];
        }
      }
      
      if (req.user.role === "BranchManager") {
        donationQuery.branchId = req.user.branch;
      } else if (branchId && branchId !== "All") {
        donationQuery.branchId = branchId;
      }

      if (search) {
        donationQuery.$or = [
          { receiptNumber: { $regex: search, $options: "i" } },
          { donorName: { $regex: search, $options: "i" } }
        ];
      }

      const donations = await Donation.find(donationQuery)
        .populate('approvedBy', 'name fullName displayName')
        .populate('branchId', 'name')
        .sort({ approvalDate: -1 })
        .lean();

      const mappedDonations = donations.map(d => {
        let cat = "Donation";
        if (d.donationType === "jama_pavti") cat = "Jama Pavti";
        if (d.donationType === "dengi_pavti") cat = "Dengi Pavti";
        if (d.donationType === "shakha_pavti") cat = "Branch Pavti";
        
        return {
          _id: d._id,
          receiptNumber: d.receiptNumber,
          category: cat,
          branchId: d.branchId,
          generatedBy: d.approvedBy,
          createdAt: d.createdAt,
          approvalDate: d.approvalDate,
          lastReceiptDownloadedAt: d.lastReceiptDownloadedAt,
          pdfUrl: d.receiptPdfUrl || `/api/donations/${d._id}/receipt`,
          dynamicData: {
            donorName: d.donorName,
            amount: d.amount,
            donationReference: d.donationReference,
            donationType: d.donationType
          }
        };
    });

      mergedReceipts = [...mergedReceipts, ...mappedDonations];
      
      // Sort combined array by most recent date (createdAt or approvalDate)
      mergedReceipts.sort((a, b) => {
        const dateA = new Date(a.approvalDate || a.createdAt);
        const dateB = new Date(b.approvalDate || b.createdAt);
        return dateB - dateA;
      });
    }

    res.status(200).json({ success: true, data: mergedReceipts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
