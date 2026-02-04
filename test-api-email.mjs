#!/usr/bin/env node
// Test the email notification by calling the API endpoint directly

const testEmailNotification = async () => {
  console.log('🧪 Testing Support Email Notification API\n');
  console.log('=' .repeat(60));
  
  const testData = {
    userId: 'test-' + Date.now(),
    subject: '🧪 Test Ticket - Email Notification',
    message: 'This is a test to verify email notifications work correctly.',
    category: 'technical',
    userEmail: 'test@example.com',
    userName: 'Test User'
  };
  
  console.log('\n📧 Sending test email with data:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('https://merry360x.com/api/support-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('\n📬 Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Email sent successfully!');
      console.log('📧 Check support@merry360x.com inbox for the test email.');
      console.log('\nThe email should include:');
      console.log('  • Subject: 🎫 [TECHNICAL] 🧪 Test Ticket - Email Notification');
      console.log('  • Customer: Test User (test@example.com)');
      console.log('  • Ticket message and details');
      console.log('  • Formatted HTML template');
    } else {
      console.log('\n❌ FAILED! Email not sent.');
      console.log('Error:', result);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
};

testEmailNotification();
