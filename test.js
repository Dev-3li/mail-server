const axios = require('axios');

// استبدل هذا بعنوان التطبيق الخاص بك على Railway
const API_URL = 'YOUR_RAILWAY_APP_URL';

async function testMailServer() {
  try {
    // إنشاء حساب جديد
    console.log('إنشاء حساب جديد...');
    const accountResponse = await axios.post(`${API_URL}/api/accounts`, {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User'
    });
    console.log('تم إنشاء الحساب:', accountResponse.data);

    // إرسال بريد تجريبي
    console.log('\nإرسال بريد تجريبي...');
    const emailResponse = await axios.post(`${API_URL}/api/send`, {
      from: 'test@example.com',
      to: 'recipient@example.com',
      subject: 'رسالة تجريبية',
      text: 'هذه رسالة تجريبية من خادم البريد'
    });
    console.log('تم إرسال البريد:', emailResponse.data);

    // جلب البريد الوارد
    console.log('\nجلب البريد الوارد...');
    const inboxResponse = await axios.get(`${API_URL}/api/emails/test@example.com`);
    console.log('البريد الوارد:', inboxResponse.data);

  } catch (error) {
    console.error('حدث خطأ:', error.response?.data || error.message);
  }
}

// تشغيل الاختبار
testMailServer();
