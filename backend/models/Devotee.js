const mongoose = require("mongoose");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");
const Sequence = require("./Sequence");

const devoteeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: "Devotee" },
  
  // New relationship fields
  devoteeId: { type: String, unique: true, sparse: true },
  familyId: { type: String, index: true },
  familyRootId: { type: mongoose.Schema.Types.ObjectId, ref: "Devotee", index: true },
  fatherId: { type: mongoose.Schema.Types.ObjectId, ref: "Devotee", index: true },
  motherId: { type: mongoose.Schema.Types.ObjectId, ref: "Devotee", index: true },
  spouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Devotee", index: true },
  isFamilyHead: { type: Boolean, default: false, index: true },
  generationLevel: { type: Number, default: 1, index: true },

  // New profile fields
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
  dob: { type: Date },
  aadhaar: { type: String },
  kuldevta: { type: String },
  bloodGroup: { type: String },
  maritalStatus: { type: String, enum: ["Single", "Married", "Divorced", "Widowed", "Separated"], default: "Single" },
  
  // New address fields
  address: { type: String },
  village: { type: String },
  taluka: { type: String },
  state: { type: String },
  city: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", index: true },
  profilePhoto: { type: String },
  profilePhotoPublicId: { type: String, default: "" },
  registrationDate: { type: Date, default: Date.now },

  // Search optimization fields
  normalizedFullName: { type: String, index: true },
  normalizedSurname: { type: String, index: true },
  normalizedFamilyName: { type: String, index: true },
  normalizedState: { type: String },
  normalizedCity: { type: String },
  normalizedVillage: { type: String },
  searchTokens: { type: [String], index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

// Compound indexes for optimization
devoteeSchema.index({ branch: 1, isDeleted: 1 });
devoteeSchema.index({ state: 1, city: 1, isDeleted: 1 });
devoteeSchema.index({ familyId: 1, isDeleted: 1 });
devoteeSchema.index({ familyRootId: 1, isDeleted: 1 });

devoteeSchema.pre("validate", async function() {
  // 2. Generate devoteeId first so it can be used for fallback email if needed
  if (!this.devoteeId) {
    const seq = await Sequence.findOneAndUpdate(
      { sequenceName: "devoteeId" },
      { $inc: { currentValue: 1 } },
      { returnDocument: "after", upsert: true }
    );
    this.devoteeId = `DEV-${seq.currentValue.toString().padStart(6, "0")}`;
  }

  // 1. Safe validation fallbacks
  if (!this.password) {
    this.password = "password123";
  }
  if (!this.mobile) {
    this.mobile = "0000000000";
  }
  if (!this.email) {
    this.email = `${this.devoteeId.toLowerCase()}@placeholder.com`;
  }
});

devoteeSchema.pre("save", async function() {
  if (this.isModified("password")) {
    this.password = await hashPassword(this.password);
  }

  // 3. Generate familyId if family head
  if (this.isFamilyHead && !this.familyId) {
    const seq = await Sequence.findOneAndUpdate(
      { sequenceName: "familyId" },
      { $inc: { currentValue: 1 } },
      { returnDocument: "after", upsert: true }
    );
    this.familyId = `FAM-${seq.currentValue.toString().padStart(6, "0")}`;
  }

  // 4. Set familyRootId if family head
  if (this.isFamilyHead && !this.familyRootId) {
    this.familyRootId = this._id;
  }

  // 5. Normalization
  const normalize = (val) => (val ? val.toString().toLowerCase().trim().replace(/\s+/g, " ") : "");
  
  this.normalizedFullName = normalize(this.name);
  
  // Extract surname (last word of name)
  const nameParts = this.normalizedFullName.split(" ");
  this.normalizedSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : this.normalizedFullName;
  this.normalizedFamilyName = this.normalizedSurname;
  
  this.normalizedState = normalize(this.state);
  this.normalizedCity = normalize(this.city);
  this.normalizedVillage = normalize(this.village);

  // 6. Generate searchTokens
  const tokens = new Set();
  const rawWords = [];
  
  if (this.name) rawWords.push(...this.name.toLowerCase().split(/\s+/));
  if (this.mobile) rawWords.push(this.mobile);
  if (this.email) rawWords.push(this.email.toLowerCase());
  if (this.devoteeId) rawWords.push(this.devoteeId.toLowerCase());
  if (this.familyId) rawWords.push(this.familyId.toLowerCase());
  if (this.city) rawWords.push(this.city.toLowerCase());
  if (this.village) rawWords.push(this.village.toLowerCase());
  if (this.taluka) rawWords.push(this.taluka.toLowerCase());
  if (this.state) rawWords.push(this.state.toLowerCase());


  rawWords.forEach(word => {
    if (!word) return;
    tokens.add(word);
    // Edge n-grams for prefix matching
    for (let i = 2; i <= word.length; i++) {
      tokens.add(word.substring(0, i));
    }
  });

  this.searchTokens = Array.from(tokens);
});

devoteeSchema.methods.matchPassword = async function(enteredPassword) {
  return await verifyAndRehashPassword(enteredPassword, this);
};

module.exports = mongoose.model("Devotee", devoteeSchema);

