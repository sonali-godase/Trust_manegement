const mongoose = require("mongoose");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");

const accountantSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  password: { type: String, required: true },
  profilePhoto: { type: String, default: "" },
  profilePhotoPublicId: { type: String, default: "" },
  createdByTrusteeId: { type: mongoose.Schema.Types.ObjectId, ref: "Trustee", required: true },
  emailVerified: { type: Boolean, default: false },
  accountStatus: { type: String, enum: ["active", "inactive"], default: "active" },
  role: { type: String, default: "Accountant" }
}, { timestamps: true });

accountantSchema.pre("save", async function() {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await hashPassword(this.password);
});

accountantSchema.methods.matchPassword = async function(enteredPassword) {
  return await verifyAndRehashPassword(enteredPassword, this);
};

module.exports = mongoose.model("Accountant", accountantSchema);
