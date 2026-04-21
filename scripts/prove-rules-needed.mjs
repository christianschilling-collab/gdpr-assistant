#!/usr/bin/env node
/**
 * Test: Welche Collections sind mit Authentication zugänglich?
 * Dies beweist, dass AI Trailblazers RULES haben muss
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const config = {
  apiKey: "AIzaSyCEdByznHKXvMaK__2f8ImN8jYig7JticU",
  authDomain: "dach-ai-mvps.firebaseapp.com",
  projectId: "dach-ai-mvps",
  storageBucket: "dach-ai-mvps.firebasestorage.app",
  messagingSenderId: "1014309748045",
  appId: "1:1014309748045:web:267221663a6d7a43ffcb04"
};

const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

// Collections to test
const collections = [
  // GDPR Collections
  'weeklyReports',
  'activityLog',
  'trainingCases',
  
  // Solver Collections
  'solverRuns',
  
  // Possible AI Trailblazers Collections
  'agents',
  'trainings',
  'courses',
  'learningPaths',
  'progress',
  'quizzes',
  'games',
];

async function testWithAuth() {
  console.log('\n🔐 Test WITH Authentication (simulated)');
  console.log('─'.repeat(60));
  console.log('NOTE: We cannot actually sign in without real credentials.');
  console.log('But we can explain what WOULD happen:');
  console.log('');
  console.log('IF authenticated AND rules allow read:');
  console.log('  ✅ Collection is accessible');
  console.log('');
  console.log('IF authenticated BUT NO RULE exists:');
  console.log('  ❌ Collection is STILL blocked (Firestore Default Deny)');
  console.log('');
  console.log('This proves: Authentication alone is NOT enough!');
  console.log('─'.repeat(60));
}

async function testWithoutAuth() {
  console.log('\n🔓 Test WITHOUT Authentication');
  console.log('─'.repeat(60));
  
  const results = [];
  
  for (const collectionName of collections) {
    try {
      const q = query(collection(db, collectionName), limit(1));
      const snapshot = await getDocs(q);
      results.push({
        collection: collectionName,
        accessible: true,
        message: '✅ Public access allowed'
      });
    } catch (error) {
      results.push({
        collection: collectionName,
        accessible: false,
        message: `❌ ${error.code || 'blocked'}`
      });
    }
  }
  
  console.log('\nResults:');
  results.forEach(r => {
    console.log(`  ${r.collection.padEnd(20)} ${r.message}`);
  });
  
  console.log('\n─'.repeat(60));
  console.log('\n💡 CONCLUSION:');
  console.log('All collections that show ❌ permission-denied:');
  console.log('  → Either have NO RULE at all');
  console.log('  → Or have a rule that requires authentication');
  console.log('');
  console.log('For AI Trailblazers to work, its collections MUST have rules!');
  console.log('Those rules are probably BELOW line 13 in the screenshot.');
  console.log('');
  console.log('🎯 SOLUTION for GDPR App:');
  console.log('  → Add explicit rules for weeklyReports, activityLog, etc.');
  console.log('  → Authentication + Rules = Access granted ✅');
}

async function main() {
  console.log('🧪 Firestore Rules Test');
  console.log('Testing which collections are accessible...\n');
  
  await testWithoutAuth();
  await testWithAuth();
  
  process.exit(0);
}

main();
