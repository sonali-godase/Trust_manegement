const mongoose = require("mongoose");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");

const trusteeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  designation: { type: String, required: true },
  address: { type: String, required: true },
  aadhaar: { type: String },
  profilePhoto: { type: String },
  profilePhotoPublicId: { type: String, default: "" },
  audioTrack: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: "Trustee" },
  systemRole: { type: String, default: "Trust Member" },
  status: { type: String, default: "Active", enum: ["Active", "Inactive"] },
  permissions: {
    type: [{
      module: { type: String, required: true },
      level: { type: String, enum: ['View', 'Manage'], required: true }
    }],
    default: [
      { module: 'Dashboard', level: 'View' },
      { module: 'Devotees', level: 'View' },
      { module: 'Donations', level: 'View' },
      { module: 'Events', level: 'View' },
      { module: 'Announcements', level: 'Manage' },
      { module: 'Branches', level: 'View' },
      { module: 'Documents', level: 'View' },
      { module: 'Annadan', level: 'View' },
      { module: 'Sansthan Updates', level: 'View' },
      { module: 'Gallery', level: 'View' },
      { module: 'Monastery History', level: 'View' },
      { module: 'Lineage', level: 'View' },
      { module: 'Accountants', level: 'View' },
      { module: 'Official Correspondence', level: 'Manage' }
    ]
  }
}, { timestamps: true });

trusteeSchema.pre("save", async function() {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await hashPassword(this.password);
});

trusteeSchema.methods.matchPassword = async function(enteredPassword) {
  return await verifyAndRehashPassword(enteredPassword, this);
};

module.exports = mongoose.model("Trustee", trusteeSchema);
