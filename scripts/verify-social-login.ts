#!/usr/bin/env node

console.log('🔍 Verifying Social Login Setup...\n');

const fs = require('fs');
const path = require('path');

let hasErrors = false;
let hasWarnings = false;

function checkFile(filePath: string, description: string): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}`);
    return true;
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    hasErrors = true;
    return false;
  }
}

function checkEnvVariable(varName: string, required: boolean = false): boolean {
  const value = process.env[varName];
  if (value && !value.includes('your-')) {
    console.log(`✅ ${varName} is configured`);
    return true;
  } else if (required) {
    console.log(`❌ ${varName} is not configured (required)`);
    hasErrors = true;
    return false;
  } else {
    console.log(`⚠️  ${varName} is not configured (optional)`);
    hasWarnings = true;
    return false;
  }
}

console.log('📁 Checking Required Files...\n');

checkFile('backend/services/oauth.ts', 'OAuth Service');
checkFile('backend/routes/auth.ts', 'Auth Routes');
checkFile('backend/db/users.ts', 'User Database');
checkFile('backend/utils/jwt.ts', 'JWT Utils');
checkFile('utils/socialAuth.ts', 'Social Auth Utils');
checkFile('app/auth/login.tsx', 'Login Screen');
checkFile('app/auth/success.tsx', 'Success Screen');
checkFile('.env.example', 'Environment Template');

console.log('\n🔐 Checking Environment Variables...\n');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');

  require('dotenv').config();

  checkEnvVariable('FRONTEND_URL', true);
  checkEnvVariable('JWT_SECRET', true);

  console.log('\n🔌 Checking OAuth Providers...\n');

  const googleConfigured = checkEnvVariable('GOOGLE_CLIENT_ID') && checkEnvVariable('GOOGLE_CLIENT_SECRET');
  const facebookConfigured = checkEnvVariable('FACEBOOK_APP_ID') && checkEnvVariable('FACEBOOK_APP_SECRET');
  const vkConfigured = checkEnvVariable('VK_CLIENT_ID') && checkEnvVariable('VK_CLIENT_SECRET');

  if (!googleConfigured && !facebookConfigured && !vkConfigured) {
    console.log('\n⚠️  No OAuth providers configured. Social login will not work.');
    console.log('   Configure at least one provider in .env file.');
    hasWarnings = true;
  }
} else {
  console.log('❌ .env file not found');
  console.log('   Run: cp .env.example .env');
  hasErrors = true;
}

console.log('\n📚 Checking Documentation...\n');

checkFile('SOCIAL_LOGIN_SETUP.md', 'Setup Guide');
checkFile('SOCIAL_LOGIN_QUICK_START.md', 'Quick Start Guide');
checkFile('SOCIAL_LOGIN_TESTING.md', 'Testing Guide');

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ Setup verification failed. Please fix the errors above.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  Setup verification completed with warnings.');
  console.log('   Social login may not work until you configure OAuth providers.');
  console.log('\n📖 Next steps:');
  console.log('   1. Add OAuth credentials to .env file');
  console.log('   2. See SOCIAL_LOGIN_QUICK_START.md for setup instructions');
  console.log('   3. Run: npm start');
  process.exit(0);
} else {
  console.log('\n✅ All checks passed! Social login is ready to use.');
  console.log('\n📖 Next steps:');
  console.log('   1. Run: npm start');
  console.log('   2. Test social login on the login screen');
  console.log('   3. See SOCIAL_LOGIN_TESTING.md for testing guide');
  process.exit(0);
}
