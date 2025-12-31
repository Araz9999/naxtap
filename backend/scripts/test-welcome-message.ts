import { sendWelcomeMessage, getSystemUser } from '../services/welcomeMessage';
import { logger } from '../utils/logger';

/**
 * Test script for welcome message functionality
 * Tests sending welcome messages in different languages
 */

async function testWelcomeMessage() {
  logger.info('=== Testing Welcome Message System ===');

  // Test system user
  const systemUser = getSystemUser();
  logger.info('System User:', systemUser);

  // Test welcome message in Azerbaijani
  logger.info('\n--- Testing Azerbaijani Welcome Message ---');
  const testUserId1 = 'test-user-az-' + Date.now();
  const result1 = await sendWelcomeMessage(testUserId1, 'az');
  logger.info(`Azerbaijani message sent: ${result1 ? '✅ Success' : '❌ Failed'}`);

  // Test welcome message in Russian
  logger.info('\n--- Testing Russian Welcome Message ---');
  const testUserId2 = 'test-user-ru-' + Date.now();
  const result2 = await sendWelcomeMessage(testUserId2, 'ru');
  logger.info(`Russian message sent: ${result2 ? '✅ Success' : '❌ Failed'}`);

  // Test welcome message in English
  logger.info('\n--- Testing English Welcome Message ---');
  const testUserId3 = 'test-user-en-' + Date.now();
  const result3 = await sendWelcomeMessage(testUserId3, 'en');
  logger.info(`English message sent: ${result3 ? '✅ Success' : '❌ Failed'}`);

  // Test with invalid user ID
  logger.info('\n--- Testing Invalid User ID ---');
  const result4 = await sendWelcomeMessage('', 'az');
  logger.info(`Invalid user ID handled: ${!result4 ? '✅ Correctly rejected' : '❌ Should have failed'}`);

  logger.info('\n=== All Tests Completed ===');
}

// Run tests
testWelcomeMessage().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});
