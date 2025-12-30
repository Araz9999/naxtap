/**
 * Test script for authentication endpoints (tRPC)
 * Run with: node test-auth.js
 */

/* eslint-disable no-console */

const BASE_URL = 'http://localhost:3000';

// Import superjson to serialize inputs (tRPC uses superjson transformer)
const superjson = require('superjson');

// Helper to call tRPC endpoint
// tRPC HTTP adapter expects: POST /api/trpc/{procedure} with JSON body containing the input
async function callTRPC(procedure, input, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // tRPC HTTP format: POST /api/trpc/{procedure}
    // Body should be serialized with superjson (since backend uses superjson transformer)
    const serialized = superjson.serialize(input);
    const body = JSON.stringify(serialized);
    console.log(`   📤 Calling ${procedure}...`);

    const response = await fetch(`${BASE_URL}/api/trpc/${procedure}`, {
      method: 'POST',
      headers,
      body: body,
    });

    if (!response.ok) {
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text, status: response.status };
      }
      return { response, data };
    }

    const data = await response.json();
    return { response, data };
  } catch (error) {
    return {
      response: { ok: false, status: 0 },
      data: { error: error.message, stack: error.stack },
    };
  }
}

async function testAuth() {
  console.log('🧪 Testing Authentication Endpoints (tRPC)\n');
  console.log('='.repeat(50));

  let userToken = null;

  // Test 1: Login with seeded user
  console.log('\n1️⃣ Testing Login (user@test.com)...');
  try {
    const { response, data } = await callTRPC('auth.login', {
      email: 'user@test.com',
      password: 'Test1234',
    });

    if (response.ok && data.result?.data?.json?.tokens) {
      console.log('✅ Login successful!');
      const result = data.result.data.json;
      userToken = result.tokens.accessToken;
      console.log('   Token:', userToken.substring(0, 50) + '...');
      console.log('   User:', result.user.email, `(${result.user.role})`);
      console.log('   Name:', result.user.name);
      console.log('   Verified:', result.user.verified);
    } else {
      console.log('❌ Login failed:', JSON.stringify(data, null, 2));
      return;
    }

    // Test 2: Login with admin
    console.log('\n2️⃣ Testing Admin Login (admin@test.com)...');
    const { response: adminResponse, data: adminData } = await callTRPC('auth.login', {
      email: 'admin@test.com',
      password: 'Admin1234',
    });

    if (adminResponse.ok && adminData.result?.data?.json?.tokens) {
      console.log('✅ Admin login successful!');
      const result = adminData.result.data.json;
      console.log('   User:', result.user.email, `(${result.user.role})`);
    } else {
      console.log('❌ Admin login failed:', JSON.stringify(adminData, null, 2));
    }

    // Test 3: Login with moderator
    console.log('\n3️⃣ Testing Moderator Login (moderator@test.com)...');
    const { response: modResponse, data: modData } = await callTRPC('auth.login', {
      email: 'moderator@test.com',
      password: 'Mod1234',
    });

    if (modResponse.ok && modData.result?.data?.json?.tokens) {
      console.log('✅ Moderator login successful!');
      const result = modData.result.data.json;
      console.log('   User:', result.user.email, `(${result.user.role})`);
    } else {
      console.log('❌ Moderator login failed:', JSON.stringify(modData, null, 2));
    }

    // Test 4: Test invalid login
    console.log('\n4️⃣ Testing Invalid Login...');
    const { response: invalidResponse, data: invalidData } = await callTRPC('auth.login', {
      email: 'user@test.com',
      password: 'WrongPassword',
    });

    if (!invalidResponse.ok || invalidData.error) {
      console.log('✅ Invalid login correctly rejected');
      console.log('   Error:', invalidData.error?.message || JSON.stringify(invalidData, null, 2));
    } else {
      console.log('❌ Invalid login should have been rejected!');
    }

    // Test 5: Register new user
    console.log('\n5️⃣ Testing User Registration...');
    const testEmail = `test${Date.now()}@example.com`;
    const { response: registerResponse, data: registerData } = await callTRPC('auth.register', {
      email: testEmail,
      password: 'Test1234',
      name: 'Test User',
    });

    if (registerResponse.ok && registerData.result?.data?.json?.user) {
      console.log('✅ Registration successful!');
      const result = registerData.result.data.json;
      console.log('   User:', result.user.email);
      console.log('   Verified:', result.user.verified);
    } else {
      console.log('❌ Registration failed:', JSON.stringify(registerData, null, 2));
    }

    // Test 6: Test duplicate registration
    console.log('\n6️⃣ Testing Duplicate Registration...');
    const { response: dupResponse, data: dupData } = await callTRPC('auth.register', {
      email: 'user@test.com', // Already exists
      password: 'Test1234',
      name: 'Test User',
    });

    if (!dupResponse.ok || dupData.error) {
      console.log('✅ Duplicate registration correctly rejected');
      console.log('   Error:', dupData.error?.message || JSON.stringify(dupData, null, 2));
    } else {
      console.log('❌ Duplicate registration should have been rejected!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Authentication tests completed!');
}

// Run tests
testAuth().catch(console.error);

