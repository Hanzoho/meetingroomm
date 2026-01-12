// Simple test for forgot password API
const testForgotPassword = async () => {
  try {
    console.log('🧪 Testing New Forgot Password Logic...')
    
    // Test 1: Email that exists in system
    console.log('\n📧 Test 1: Email that exists (user2@gmail.com)')
    const response1 = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'user2@gmail.com' })
    })

    const data1 = await response1.json()
    console.log('📊 Response Status:', response1.status)
    console.log('📊 Response Data:', data1)
    
    // Test 2: Email that doesn't exist
    console.log('\n📧 Test 2: Email that does NOT exist (notfound@example.com)')
    const response2 = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'notfound@example.com' })
    })

    const data2 = await response2.json()
    console.log('📊 Response Status:', response2.status)
    console.log('📊 Response Data:', data2)
    
    console.log('\n✅ Tests completed')

  } catch (error) {
    console.error('❌ Test ERROR:', error)
  }
}

testForgotPassword()