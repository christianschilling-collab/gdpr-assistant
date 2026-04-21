/**
 * Script to initialize Categories and Requester Types in Firestore
 * Run with: npm run init-data OR npx tsx scripts/init-data.ts
 *
 * Modes:
 * 1) If FIREBASE_SERVICE_ACCOUNT is set in .env.local (JSON of a service account key),
 *    uses firebase-admin — bypasses security rules (recommended for first-time seed).
 * 2) Otherwise uses the client SDK — requires rules that allow writes without auth
 *    (e.g. after deploying repo firestore.rules) or sign-in (not used here).
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

import * as admin from 'firebase-admin';
import { createCategory } from '../lib/firebase/categories';
import { createRequesterType } from '../lib/firebase/requesterTypes';

const categories = [
  {
    name: 'Datenlöschung',
    nameEn: 'Data Deletion',
    description: 'Anfragen zur Löschung personenbezogener Daten',
    icon: '🗑️',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Werbung deaktivieren',
    nameEn: 'Advertising Opt-Out',
    description: 'Anfragen zur Deaktivierung von Werbung und Marketing',
    icon: '📭',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Datenauskunft',
    nameEn: 'Data Access Request',
    description: 'Anfragen auf Auskunft über gespeicherte personenbezogene Daten',
    icon: '📄',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Beschwerden',
    nameEn: 'Complaints',
    description: 'Beschwerden zu Datenschutz-Themen',
    icon: '⚠️',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Breaches und Incidents',
    nameEn: 'Breaches and Incidents',
    description: 'Meldungen über Datenschutzverletzungen und Sicherheitsvorfälle',
    icon: '🚨',
    sortOrder: 5,
    isActive: true,
  },
];

const requesterTypes = [
  {
    name: 'Kunde',
    nameEn: 'Customer',
    description: 'Bestehender oder ehemaliger Kunde von HelloFresh',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Nichtkunde',
    nameEn: 'Non-Customer',
    description: 'Person ohne Kundenbeziehung zu HelloFresh',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Bewerber',
    nameEn: 'Applicant',
    description: 'Person, die sich bei HelloFresh beworben hat',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Mitarbeiter',
    nameEn: 'Employee',
    description: 'Aktueller oder ehemaliger Mitarbeiter von HelloFresh',
    sortOrder: 4,
    isActive: true,
  },
];

function initAdminIfNeeded(): admin.firestore.Firestore {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  }
  const cred = JSON.parse(raw) as admin.ServiceAccount;
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(cred) });
  }
  return admin.firestore();
}

async function initWithAdmin() {
  const db = initAdminIfNeeded();
  const now = admin.firestore.Timestamp.now();

  console.log('🔑 Using FIREBASE_SERVICE_ACCOUNT (Admin SDK)\n');

  console.log('📋 Creating Categories...');
  for (const category of categories) {
    const ref = await db.collection('categories').add({
      name: category.name,
      nameEn: category.nameEn,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✅ Created: ${category.name} (${ref.id})`);
  }

  console.log('\n👥 Creating Requester Types...');
  for (const type of requesterTypes) {
    const ref = await db.collection('requesterTypes').add({
      name: type.name,
      nameEn: type.nameEn,
      description: type.description,
      sortOrder: type.sortOrder,
      isActive: type.isActive,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✅ Created: ${type.name} (${ref.id})`);
  }
}

async function initWithClient() {
  let failures = 0;

  console.log('🌐 Using client SDK (no service account)\n');

  console.log('📋 Creating Categories...');
  for (const category of categories) {
    try {
      const id = await createCategory(category);
      console.log(`  ✅ Created: ${category.name} (${id})`);
    } catch (err: any) {
      failures++;
      console.error(`  ❌ Failed to create ${category.name}:`, err.message);
    }
  }

  console.log('\n👥 Creating Requester Types...');
  for (const type of requesterTypes) {
    try {
      const id = await createRequesterType(type);
      console.log(`  ✅ Created: ${type.name} (${id})`);
    } catch (err: any) {
      failures++;
      console.error(`  ❌ Failed to create ${type.name}:`, err.message);
    }
  }

  if (failures > 0) {
    console.log('\n---');
    console.log(
      'PERMISSION_DENIED usually means Firestore rules require a signed-in user for writes.'
    );
    console.log('Fix: add a service account key to .env.local as FIREBASE_SERVICE_ACCOUNT');
    console.log(
      '(Project settings → Service accounts → Generate new private key → paste JSON as one line),'
    );
    console.log('then run: npm run init-data again.');
    console.log('Or deploy this repo’s firestore.rules to team-cc-gdpr if rules allow your case.');
    console.log('---\n');
    process.exit(1);
  }
}

async function initData() {
  console.log('🚀 Starting data initialization...\n');

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
      await initWithAdmin();
    } else {
      await initWithClient();
    }

    console.log('✨ Data initialization complete!');
    console.log('\nYou can now:');
    console.log('  - View categories at: /admin/categories');
    console.log('  - View requester types at: /admin/requester-types');
    console.log('  - Add more via the admin UI');
  } catch (err: any) {
    console.error('❌ Error during initialization:', err.message || err);
    process.exit(1);
  }

  process.exit(0);
}

initData();
