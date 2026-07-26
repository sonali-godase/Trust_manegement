const mongoose = require("mongoose");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");

const branchManagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  managerId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  address: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  password: { type: String, required: true },
  role: { type: String, default: "BranchManager" },
  profilePhoto: { type: String, default: "" },
  profilePhotoPublicId: { type: String, default: "" }
}, { timestamps: true });

branchManagerSchema.pre("validate", async function() {
  if (!this.managerId || !this.managerId.trim()) {
    const BranchManagerModel = mongoose.models.BranchManager || mongoose.model("BranchManager", branchManagerSchema);
    const count = await BranchManagerModel.countDocuments();
    if (count === 0) {
      this.managerId = "BM-001";
    } else {
      const managers = await BranchManagerModel.find({}, { managerId: 1 });
      let maxNum = 0;
      managers.forEach((m) => {
        if (m.managerId) {
          const match = m.managerId.match(/^BM-?(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });
      const nextNum = maxNum + 1;
      this.managerId = `BM-${String(nextNum).padStart(3, "0")}`;
    }
  }
});

branchManagerSchema.pre("save", async function() {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await hashPassword(this.password);
});

branchManagerSchema.methods.matchPassword = async function(enteredPassword) {
  return await verifyAndRehashPassword(enteredPassword, this);
};

module.exports = mongoose.model("BranchManager", branchManagerSchema);
