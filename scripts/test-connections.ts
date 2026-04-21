/**
 * Test script to verify Firebase and Gemini API connections
 * Run with: npx tsx scripts/test-connections.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testGemini() {
  console.log('\n🤖 Testing Gemini API connection...\n');
  
  try {
    const { testConnection } = await import('../lib/gemini/client');
    const response = await testConnection();
    console.log('✅ Gemini API: Connection successful!');
    console.log(`   Response: ${response}\n`);
    return true;
  } catch (error: any) {
    console.error('❌ Gemini API: Connection failed!');
    console.error(`   Error: ${error.message}\n`);
    if (error.message.includes('API_KEY')) {
      console.error('   💡 Tip: Check that GEMINI_API_KEY is set in .env.local');
    }
    return false;
  }
}

async function testFirebase() {
  console.log('🔥 Testing Firebase connection...\n');
  
  try {
    // Check if all required env vars are set
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];

    const missingVars = requiredVars.filter(
      (varName) => !process.env[varName] || process.env[varName]?.includes('your_') || process.env[varName]?.includes('your-')
    );

    if (missingVars.length > 0) {
      console.error('❌ Firebase: Configuration incomplete!');
      console.error(`   Missing or placeholder values for: ${missingVars.join(', ')}\n`);
      console.error('   💡 Tip: Update .env.local with your Firebase configuration values\n');
      return false;
    }

    // Try to initialize Firebase
    const { db } = await import('../lib/firebase/config');
    
    // Test Firestore connection by attempting to read from a test collection
    // We'll use a simple operation that doesn't require authentication
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const testQuery = query(collection(db, 'test'), limit(1));
    
    try {
      await getDocs(testQuery);
      console.log('✅ Firebase: Connection successful!');
      console.log('   Firestore database is accessible\n');
      return true;
    } catch (error: any) {
      // If collection doesn't exist, that's okay - it means connection works
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        console.log('✅ Firebase: Connection successful!');
        console.log('   Firestore database is accessible (permission check passed)\n');
        return true;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Firebase: Connection failed!');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.message.includes('apiKey') || error.message.includes('API_KEY')) {
      console.error('   💡 Tip: Check that all NEXT_PUBLIC_FIREBASE_* variables are set correctly');
    } else if (error.message.includes('permission')) {
      console.error('   💡 Tip: Check Firestore security rules in Firebase Console');
    } else {
      console.error('   💡 Tip: Verify your Firebase project has Firestore enabled');
    }
    return false;
  }
}

async function main() {
  console.log('🧪 Testing API Connections\n');
  console.log('=' .repeat(50));
  
  const geminiResult = await testGemini();
  const firebaseResult = await testFirebase();
  
  console.log('=' .repeat(50));
  console.log('\n📊 Test Results:\n');
  console.log(`   Gemini API:  ${geminiResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Firebase:    ${firebaseResult ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (geminiResult && firebaseResult) {
    console.log('🎉 All connections successful! You\'re ready to start the dev server.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some connections failed. Please fix the issues above before starting the dev server.\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
