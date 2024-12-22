require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const Email = require('./models/Email');
const MailAccount = require('./models/MailAccount');

// إعدادات البيئة
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailserver';
const SMTP_PORT = process.env.SMTP_PORT || 2525;
const DOMAIN = process.env.DOMAIN || 'web-production-0f627.up.railway.app';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// التحقق من صحة عنوان البريد
function validateEmail(email) {
    const domain = email.split('@')[1];
    return domain === DOMAIN;
}

// اتصال بقاعدة البيانات
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('تم الاتصال بقاعدة البيانات بنجاح');
}).catch(err => {
  console.error('خطأ في الاتصال بقاعدة البيانات:', err);
});

// إعداد multer للمرفقات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// إنشاء مجلد للمرفقات
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// إعداد خادم Express للواجهة البرمجية
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// التحقق من التوكن
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'غير مصرح' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'توكن غير صالح' });
    }
    req.user = user;
    next();
  });
}

// إنشاء حساب جديد
app.post('/api/accounts', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    // التحقق من النطاق
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: `عنوان البريد يجب أن ينتهي بـ @${DOMAIN}` 
      });
    }
    
    // التحقق من عدم وجود الحساب مسبقاً
    const existingAccount = await MailAccount.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const account = new MailAccount({
      email,
      password, // سيتم تشفيره تلقائياً في النموذج
      fullName
    });

    await account.save();

    // إنشاء توكن
    const token = jwt.sign({ email: account.email }, JWT_SECRET);

    res.status(201).json({ 
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { email: account.email, fullName: account.fullName }
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في إنشاء الحساب' });
  }
});

// إرسال بريد
app.post('/api/send', authenticateToken, upload.array('attachments'), async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      path: file.path
    }));

    // حفظ البريد في قاعدة البيانات
    const email = new Email({
      from: req.user.email,
      to,
      subject,
      text,
      attachments: attachments?.map(att => ({
        filename: att.filename,
        path: att.path
      }))
    });

    await email.save();

    res.json({ message: 'تم إرسال البريد بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في إرسال البريد' });
  }
});

// جلب البريد الوارد
app.get('/api/emails/:email', authenticateToken, async (req, res) => {
  try {
    const emails = await Email.find({
      $or: [
        { to: req.params.email },
        { from: req.params.email }
      ]
    }).sort({ createdAt: -1 });

    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في جلب البريد' });
  }
});

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

// تشغيل الخوادم
smtpServer.listen(SMTP_PORT, '0.0.0.0', () => {
  console.log(`خادم SMTP يعمل على المنفذ ${SMTP_PORT}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`خادم API يعمل على المنفذ ${PORT}`);
});
