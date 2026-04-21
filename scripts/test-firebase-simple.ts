#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

async function testFirebase() {
  console.log('🔥 Testing Firebase Connection...\n');
  
  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking environment variables...');
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    console.log('   ✅ Project ID:', config.projectId);
    console.log('   ✅ Auth Domain:', config.authDomain);
    console.log('   ✅ API Key:', config.apiKey?.substring(0, 20) + '...\n');
    
    // 2. Initialize Firebase
    console.log('2️⃣ Initializing Firebase...');
    const app = initializeApp(config);
    const db = getFirestore(app);
    console.log('   ✅ Firebase initialized\n');
    
    // 3. Test reading weekly reports
    console.log('3️⃣ Testing Firestore read access...');
    const weeklyReportsRef = collection(db, 'weeklyReports');
    const snapshot = await getDocs(weeklyReportsRef);
    console.log(`   ✅ Found ${snapshot.size} weekly reports\n`);
    
    // 4. Test reading activity log
    console.log('4️⃣ Testing activity log...');
    const activityLogRef = collection(db, 'activityLog');
    const activitySnapshot = await getDocs(activityLogRef);
    console.log(`   ✅ Found ${activitySnapshot.size} activity log entries\n`);
    
    // 5. Display sample data
    if (snapshot.size > 0) {
      console.log('5️⃣ Sample data from latest report:');
      const latestDoc = snapshot.docs[0];
      const data = latestDoc.data();
      console.log('   Market:', data.market);
      console.log('   Week:', data.weekOf?.toDate?.() || 'N/A');
      console.log('   Deletion Requests:', data.deletionRequests);
      console.log('   Portability Requests:', data.portabilityRequests);
    }
    
    console.log('\n✅ All tests passed! Firebase connection is working.\n');
    
  } catch (error: any) {
    console.error('\n❌ Firebase test failed!');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testFirebase();
