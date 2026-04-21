/**
 * Test Script: Prüft ob Firestore Rules korrekt konfiguriert sind
 * 
 * Führt minimale Lese-/Schreib-Operationen durch, um zu testen,
 * ob die Rules für 'cases' und 'templates' funktionieren.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testFirestoreRules() {
  console.log('🧪 Teste Firestore Rules...\n');

  // Check if Firebase is configured
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase ist nicht konfiguriert!');
    console.error('   Bitte prüfe .env.local Datei');
    process.exit(1);
  }

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('✅ Firebase initialisiert');
    console.log(`📁 Projekt: ${firebaseConfig.projectId}\n`);

    // Test 1: Templates Collection - READ
    console.log('📋 Test 1: Templates Collection - READ');
    try {
      const templatesRef = collection(db, 'templates');
      const snapshot = await getDocs(templatesRef);
      console.log(`   ✅ READ erfolgreich (${snapshot.size} Templates gefunden)`);
    } catch (error: any) {
      console.error(`   ❌ READ fehlgeschlagen: ${error.message}`);
      console.error(`   💡 Prüfe ob 'templates' Rule existiert: match /templates/{templateId}`);
      return false;
    }

    // Test 2: Templates Collection - WRITE
    console.log('📋 Test 2: Templates Collection - WRITE');
    let testTemplateId: string | null = null;
    try {
      const templatesRef = collection(db, 'templates');
      const docRef = await addDoc(templatesRef, {
        templateName: 'TEST_TEMPLATE_DELETE_ME',
        primaryCategory: 'Test',
        templateText: 'This is a test template - can be deleted',
        customerType: 'Unknown',
        keywords: ['test'],
        whenToUse: 'For testing only',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      testTemplateId = docRef.id;
      console.log(`   ✅ WRITE erfolgreich (ID: ${docRef.id})`);
    } catch (error: any) {
      console.error(`   ❌ WRITE fehlgeschlagen: ${error.message}`);
      console.error(`   💡 Prüfe ob 'templates' Rule 'allow write' hat`);
      return false;
    }

    // Test 3: Cases Collection - READ
    console.log('📋 Test 3: Cases Collection - READ');
    try {
      const casesRef = collection(db, 'cases');
      const snapshot = await getDocs(casesRef);
      console.log(`   ✅ READ erfolgreich (${snapshot.size} Cases gefunden)`);
    } catch (error: any) {
      console.error(`   ❌ READ fehlgeschlagen: ${error.message}`);
      console.error(`   💡 Prüfe ob 'cases' Rule existiert: match /cases/{caseId}`);
      return false;
    }

    // Test 4: Cases Collection - WRITE
    console.log('📋 Test 4: Cases Collection - WRITE');
    let testCaseId: string | null = null;
    try {
      const casesRef = collection(db, 'cases');
      const docRef = await addDoc(casesRef, {
        caseId: 'TEST-CASE-DELETE-ME',
        timestamp: new Date(),
        teamMember: 'Test User',
        sourceLink: 'https://test.com',
        market: 'Test Market',
        caseDescription: 'This is a test case - can be deleted',
        urgency: 'Low',
        status: 'New',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      testCaseId = docRef.id;
      console.log(`   ✅ WRITE erfolgreich (ID: ${docRef.id})`);
    } catch (error: any) {
      console.error(`   ❌ WRITE fehlgeschlagen: ${error.message}`);
      console.error(`   💡 Prüfe ob 'cases' Rule 'allow write' hat`);
      return false;
    }

    // Cleanup: Delete test documents
    console.log('\n🧹 Cleanup: Lösche Test-Dokumente...');
    if (testTemplateId) {
      try {
        await deleteDoc(doc(db, 'templates', testTemplateId));
        console.log('   ✅ Test Template gelöscht');
      } catch (error: any) {
        console.warn(`   ⚠️  Konnte Test Template nicht löschen: ${error.message}`);
      }
    }
    if (testCaseId) {
      try {
        await deleteDoc(doc(db, 'cases', testCaseId));
        console.log('   ✅ Test Case gelöscht');
      } catch (error: any) {
        console.warn(`   ⚠️  Konnte Test Case nicht löschen: ${error.message}`);
      }
    }

    console.log('\n✅ Alle Tests erfolgreich!');
    console.log('✅ Firestore Rules sind korrekt konfiguriert.\n');
    return true;

  } catch (error: any) {
    console.error('\n❌ Unerwarteter Fehler:', error.message);
    return false;
  }
}

// Run tests
testFirestoreRules()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Fehler beim Ausführen der Tests:', error);
    process.exit(1);
  });
