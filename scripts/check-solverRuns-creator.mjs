#!/usr/bin/env node
/**
 * Check solverRuns collection for creator information
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, orderBy } from 'firebase/firestore';

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

async function checkSolverRuns() {
  console.log('🔍 Checking solverRuns collection...\n');
  
  try {
    // Try to get some documents
    const q = query(collection(db, 'solverRuns'), limit(5));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Collection is empty or you don\'t have access');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} documents\n`);
    console.log('Document details:\n');
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Document ${index + 1}: ${doc.id}`);
      console.log('─'.repeat(60));
      
      // Check for common creator fields
      const creatorFields = [
        'createdBy',
        'created_by',
        'author',
        'user',
        'userId',
        'userEmail',
        'email',
        'owner',
        'createdByEmail',
        'createdByUser'
      ];
      
      let foundCreator = false;
      creatorFields.forEach(field => {
        if (data[field]) {
          console.log(`  ${field}: ${data[field]}`);
          foundCreator = true;
        }
      });
      
      // Check timestamps
      if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        console.log(`  createdAt: ${date.toISOString()}`);
      }
      
      if (data.updatedAt) {
        const date = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
        console.log(`  updatedAt: ${date.toISOString()}`);
      }
      
      // Show all fields to help identify
      console.log('\n  All fields:', Object.keys(data).join(', '));
      
      if (!foundCreator) {
        console.log('\n  ⚠️ No explicit creator field found in this document');
      }
      
      console.log('\n');
    });
    
    console.log('\n💡 Tips:');
    console.log('  - Look for email addresses or user IDs');
    console.log('  - Check the timestamps to see when it was created');
    console.log('  - The field names might give clues about the team');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nNote: You need to be authenticated to access this collection.');
    console.log('The current rules require: request.auth != null');
  }
}

checkSolverRuns();
