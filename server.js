const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Email = require('./models/Email');
const MailAccount = require('./models/MailAccount');

// إعدادات البيئة
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailserver';
const SMTP_PORT = process.env.SMTP_PORT || 2525;

// اتصال بقاعدة البيانات
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('تم الاتصال بقاعدة البيانات بنجاح');
}).catch(err => {
  console.error('خطأ في الاتصال بقاعدة البيانات:', err);
});

// إعداد خادم Express للواجهة البرمجية
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// إعداد خادم SMTP
const smtpServer = new SMTPServer({
  secure: false,
  authOptional: true,
  disabledCommands: ['STARTTLS'],

  // التحقق من المصادقة
  async onAuth(auth, session, callback) {
    try {
      const account = await MailAccount.findOne({ email: auth.username });
      if (!account) {
        return callback(new Error('حساب غير موجود'));
      }

      const isValid = await account.verifyPassword(auth.password);
      if (!isValid) {
        return callback(new Error('كلمة مرور غير صحيحة'));
      }

      callback(null, { user: auth.username });
    } catch (error) {
      callback(error);
    }
  },

  // معالجة البريد الوارد
  async onData(stream, session, callback) {
    try {
      const parsed = await simpleParser(stream);
      
      const email = new Email({
        from: parsed.from.text,
        to: parsed.to.text,
        subject: parsed.subject,
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          content: att.content
        }))
      });

      await email.save();
      callback();
    } catch (error) {
      console.error('خطأ في معالجة البريد:', error);
      callback(error);
    }
  }
});

// مسارات API

// إنشاء حساب بريد جديد
app.post('/api/accounts', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    const account = new MailAccount({
      email,
      password,
      fullName
    });
    
    await account.save();
    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إنشاء الحساب' });
  }
});

// جلب البريد الوارد
app.get('/api/emails/:email', async (req, res) => {
  try {
    const emails = await Email.find({
      to: req.params.email,
      mailbox: 'inbox'
    }).sort({ receivedDate: -1 });
    
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب البريد' });
  }
});

// إرسال بريد جديد
app.post('/api/send', async (req, res) => {
  try {
    const { from, to, subject, text, html } = req.body;
    
    const email = new Email({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
      mailbox: 'sent'
    });
    
    await email.save();
    res.json({ message: 'تم إرسال البريد بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إرسال البريد' });
  }
});

// تشغيل الخوادم
smtpServer.listen(SMTP_PORT, '0.0.0.0', () => {
  console.log(`خادم SMTP يعمل على المنفذ ${SMTP_PORT}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`خادم API يعمل على المنفذ ${PORT}`);
});
