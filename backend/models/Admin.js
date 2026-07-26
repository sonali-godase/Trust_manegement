const mongoose = require("mongoose");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: "Admin"
  },
  role: {
    type: String,
    default: "Admin" // Admin is Super User
  },
  mobile: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  profilePhoto: {
    type: String,
    default: ""
  },
  profilePhotoPublicId: {
    type: String,
    default: ""
  }
}, { timestamps: true });

adminSchema.pre("save", async function() {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await hashPassword(this.password);
});

adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await verifyAndRehashPassword(enteredPassword, this);
};

module.exports = mongoose.model("Admin", adminSchema);
