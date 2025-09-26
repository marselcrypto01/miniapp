// Простой тест для проверки API записи событий тестов
// Запустите: node test-api.js

const testData = {
  client_id: 'test-client-' + Date.now(),
  username: '@testuser',
  lesson_id: 1,
  correct_answers: 3,
  total_questions: 5,
  percentage: 60
};

async function testAPI() {
  try {
    console.log('Testing API with data:', testData);
    
    const response = await fetch('http://localhost:3000/api/events/test-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
    if (result.ok) {
      console.log('✅ API test successful!');
    } else {
      console.log('❌ API test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ API test error:', error.message);
  }
}

testAPI();
