const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mailAccountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  quotaBytes: {
    type: Number,
    default: 1024 * 1024 * 1024 // 1GB default quota
  },
  usedQuotaBytes: {
    type: Number,
    default: 0
  }
});

mailAccountSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

mailAccountSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('MailAccount', mailAccountSchema);
