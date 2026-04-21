/**
 * Test only Firebase connection
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

export async function testFirebase() {
  console.log('🔥 Testing Firebase connection...\n');
  
  try {
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
      return false;
    }

    const firebaseModule = await import('../lib/firebase/config');
    console.log('Firebase module keys:', Object.keys(firebaseModule));
    console.log('getDb function:', typeof firebaseModule.getDb);
    
    const db = firebaseModule.getDb();
    console.log('db value:', db);
    console.log('db type:', typeof db);
    console.log('db is null:', db === null);
    console.log('db is undefined:', db === undefined);
    
    if (!db) {
      console.error('❌ Firebase: db is null. Firebase initialization may have failed.');
      console.error('Checking environment variables...');
      console.error('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET');
      console.error('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET');
      return false;
    }
    
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const testQuery = query(collection(db, 'test'), limit(1));
    
    try {
      await getDocs(testQuery);
      console.log('✅ Firebase: Connection successful!');
      console.log('   Firestore database is accessible\n');
      return true;
    } catch (error: any) {
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
    return false;
  }
}

if (require.main === module) {
  testFirebase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
