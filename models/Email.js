const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  content: Buffer
});

const emailSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true
  },
  to: [{
    type: String,
    required: true
  }],
  subject: String,
  text: String,
  html: String,
  attachments: [attachmentSchema],
  receivedDate: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  mailbox: {
    type: String,
    enum: ['inbox', 'sent', 'draft', 'trash'],
    default: 'inbox'
  }
});

module.exports = mongoose.model('Email', emailSchema);
