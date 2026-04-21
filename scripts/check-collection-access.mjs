#!/usr/bin/env node
/**
 * Script to check which collections are accessible in Firestore
 * Tests read access to different collections
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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

const collectionsToTest = [
  'weeklyReports',
  'activityLog',
  'trainingCases',
  'marketDeepDive',
  'solverRuns',
  'quizzes',
  'games',
  'cases',
  'templates',
  'categories',
  'users'
];

async function testCollection(collectionName) {
  try {
    const q = query(collection(db, collectionName), limit(1));
    const snapshot = await getDocs(q);
    return { 
      collection: collectionName, 
      accessible: true, 
      count: snapshot.size,
      error: null 
    };
  } catch (error) {
    return { 
      collection: collectionName, 
      accessible: false, 
      count: 0,
      error: error.code || error.message 
    };
  }
}

async function checkAllCollections() {
  console.log('🔍 Testing Firestore Collection Access (unauthenticated)\n');
  console.log('Project:', config.projectId);
  console.log('Testing', collectionsToTest.length, 'collections...\n');
  
  const results = await Promise.all(
    collectionsToTest.map(col => testCollection(col))
  );
  
  console.log('Results:');
  console.log('─'.repeat(60));
  
  const accessible = results.filter(r => r.accessible);
  const blocked = results.filter(r => !r.accessible);
  
  if (accessible.length > 0) {
    console.log('\n✅ ACCESSIBLE Collections (read: true):');
    accessible.forEach(r => {
      console.log(`   ${r.collection.padEnd(20)} - ${r.count} docs found`);
    });
  }
  
  if (blocked.length > 0) {
    console.log('\n❌ BLOCKED Collections (permission-denied):');
    blocked.forEach(r => {
      console.log(`   ${r.collection.padEnd(20)} - Error: ${r.error}`);
    });
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log(`Summary: ${accessible.length} accessible, ${blocked.length} blocked`);
  
  process.exit(0);
}

checkAllCollections();
