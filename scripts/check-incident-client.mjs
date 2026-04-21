// Quick script to check Firestore incident
import { getDb } from '../lib/firebase/config.js';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

async function checkIncident() {
  const db = getDb();
  const incidentId = '3eOMDDORIG4hRtS6La74';
  
  console.log(`🔍 Checking incident: ${incidentId}`);
  
  try {
    const docRef = doc(db, 'incidents', incidentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('❌ Incident NOT FOUND in Firestore');
      
      // List all incidents
      console.log('\n📋 All incidents in database:');
      const allIncidents = await getDocs(collection(db, 'incidents'));
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
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkIncident();
