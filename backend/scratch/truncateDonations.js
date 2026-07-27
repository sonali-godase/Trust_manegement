require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Donation = require("../models/Donation");
const ReceiptArchive = require("../models/ReceiptArchive");

const truncateDonations = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB. Starting donation records truncation...");

    const donationDeleteResult = await Donation.deleteMany({});
    console.log(`Deleted ${donationDeleteResult.deletedCount} records from 'Donation' collection.`);

    const donationCategories = ["Jama Pavti", "Dengi Pavti", "Branch Pavti", "Donation", "Branch Donation"];
    const archiveDeleteResult = await ReceiptArchive.deleteMany({ category: { $in: donationCategories } });
    console.log(`Deleted ${archiveDeleteResult.deletedCount} donation records from 'ReceiptArchive' collection.`);

    console.log("Donation records truncation completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during donation truncation:", error);
    process.exit(1);
  }
};

truncateDonations();
