/**
 * Interactive Firebase Configuration Helper
 * Run with: npm run configure:firebase
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as readline from 'readline';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔥 Firebase Configuration Helper\n');
  console.log('=' .repeat(50));
  console.log('\nThis script will help you configure Firebase in your .env.local file.\n');
  console.log('📋 Prerequisites:');
  console.log('   1. Firebase project created at https://console.firebase.google.com/');
  console.log('   2. Firestore Database enabled');
  console.log('   3. Web app registered (get config from Project Settings)\n');
  
  const continueSetup = await question('Do you have your Firebase config ready? (y/n): ');
  
  if (continueSetup.toLowerCase() !== 'y') {
    console.log('\n📖 Please follow these steps first:');
    console.log('   1. Go to https://console.firebase.google.com/');
    console.log('   2. Create a project or select existing');
    console.log('   3. Enable Firestore Database');
    console.log('   4. Go to Project Settings > Your apps > Web app');
    console.log('   5. Copy your firebaseConfig values\n');
    console.log('   Then run this script again: npm run configure:firebase\n');
    rl.close();
    return;
  }

  console.log('\n📝 Please enter your Firebase configuration values:\n');
  console.log('(You can find these in Firebase Console > Project Settings > Your apps > Web app)\n');

  const apiKey = await question('NEXT_PUBLIC_FIREBASE_API_KEY: ');
  const authDomain = await question('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ');
  const projectId = await question('NEXT_PUBLIC_FIREBASE_PROJECT_ID: ');
  const storageBucket = await question('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ');
  const messagingSenderId = await question('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ');
  const appId = await question('NEXT_PUBLIC_FIREBASE_APP_ID: ');

  // Validate inputs
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    console.log('\n❌ Error: All fields are required. Please try again.\n');
    rl.close();
    return;
  }

  // Read current .env.local
  const envPath = resolve(process.cwd(), '.env.local');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  // Update Firebase variables
  const updates: { [key: string]: string } = {
    'NEXT_PUBLIC_FIREBASE_API_KEY': apiKey,
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': authDomain,
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID': projectId,
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': storageBucket,
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': messagingSenderId,
    'NEXT_PUBLIC_FIREBASE_APP_ID': appId,
  };

  // Replace or add each variable
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add at the end if not found
      envContent += `\n${key}=${value}`;
    }
  }

  // Write back to file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Firebase configuration updated in .env.local!\n');
  console.log('🧪 Testing connection...\n');

  rl.close();

  // Test the connection
  try {
    const { testFirebase } = await import('./test-firebase-only');
    await testFirebase();
  } catch (error) {
    console.log('\n⚠️  Run "npm run test:connections" to verify your configuration.\n');
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
