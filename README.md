# خادم البريد الإلكتروني

خادم بريد إلكتروني مبني باستخدام Node.js

## المميزات
- خدمة SMTP
- واجهة برمجية REST
- دعم المرفقات
- تخزين في MongoDB
- نظام مصادقة آمن

## المتطلبات
- Node.js
- MongoDB

## التثبيت
1. نسخ المستودع
```bash
git clone [رابط المستودع]
cd MailServer
```

2. تثبيت التبعيات
```bash
npm install
```

3. إعداد المتغيرات البيئية
```
PORT=3002
MONGODB_URI=mongodb://localhost:27017/mailserver
SMTP_PORT=2525
```

4. تشغيل الخادم
```bash
npm start
```

## المسارات البرمجية
- POST /api/accounts - إنشاء حساب جديد
- GET /api/emails/:email - جلب البريد الوارد
- POST /api/send - إرسال بريد جديد

## الترخيص
MIT
