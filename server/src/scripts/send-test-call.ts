/**
 * Standalone CLI test script to trigger an incoming call to a registered user
 *
 * Usage:
 *   npm run test-call [targetUserId] [callerName]
 *
 * Example:
 *   npm run test-call user_a
 */
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const targetUserId = process.argv[2] || 'user_a';
  const callerName = process.argv[3] || 'John Doe (Test Caller)';

  console.log(`\n📞 [Test Call] Initiating test call to user: "${targetUserId}" as "${callerName}"...\n`);

  // Query server API endpoint
  const serverUrl = process.env.SERVER_PUBLIC_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${serverUrl}/api/initiate-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerId: 'test_caller_bot',
        calleeId: targetUserId,
      }),
    });

    const data = (await response.json()) as any;
    if (response.ok) {
      console.log(`✅ Success! Incoming call push dispatched.`);
      console.log(`   Server Call ID: ${data.serverCallId}`);
      console.log(`   Check your Android phone — native ringing screen should appear now!\n`);
    } else {
      console.error(`❌ Call failed:`, data.error || data);
    }
  } catch (err: any) {
    console.error(`❌ Could not connect to server at ${serverUrl}:`, err.message);
    console.log(`💡 Make sure the server is running with 'npm run dev' inside the server/ directory.`);
  }
}

main();
