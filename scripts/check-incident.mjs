import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore();

async function checkIncident(incidentId) {
  console.log(`🔍 Checking incident: ${incidentId}`);
  
  try {
    const docRef = db.collection('incidents').doc(incidentId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      console.log('❌ Incident NOT FOUND in Firestore');
      
      // List all incidents
      console.log('\n📋 All incidents in database:');
      const allIncidents = await db.collection('incidents').get();
      console.log(`Total incidents: ${allIncidents.size}`);
      
      allIncidents.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id} | ${data.incidentId || 'NO-ID'} | ${data.natureOfIncident?.substring(0, 50) || 'NO-NATURE'}`);
      });
      
      return;
    }
    
    console.log('✅ Incident FOUND!');
    const data = docSnap.data();
    console.log('\n📄 Incident Data:');
    console.log(`  ID: ${docSnap.id}`);
    console.log(`  Incident ID: ${data.incidentId}`);
    console.log(`  Nature: ${data.natureOfIncident}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Created: ${data.createdAt?.toDate?.()}`);
    console.log(`  Discovery Date: ${data.discoveryDate?.toDate?.()}`);
    
    // Check tasks
    const tasksSnap = await db.collection('incidentTasks')
      .where('incidentId', '==', incidentId)
      .get();
    console.log(`\n📝 Tasks: ${tasksSnap.size}`);
    tasksSnap.forEach(doc => {
      const task = doc.data();
      console.log(`  - ${task.title} (${task.priority || 'no-priority'}, ${task.status})`);
    });
    
    // Check audit log
    const auditSnap = await db.collection('incidentAuditLog')
      .where('incidentId', '==', incidentId)
      .get();
    console.log(`\n📜 Audit Logs: ${auditSnap.size}`);
    auditSnap.forEach(doc => {
      const log = doc.data();
      console.log(`  - ${log.action} by ${log.changedBy} at ${log.timestamp?.toDate?.()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run check
const incidentId = process.argv[2] || '3eOMDDORIG4hRtS6La74';
checkIncident(incidentId).then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
