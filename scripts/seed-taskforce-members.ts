/**
 * Seed script to create initial Task-Force Members for testing
 * 
 * Run with: npm run seed:taskforce
 */

import { createTaskForceMember } from '../lib/firebase/taskForce';
import { initializeApp } from 'firebase/app';

// Firebase config (this should match your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

async function seedTaskForceMembers() {
  console.log('🌱 Seeding Task-Force Members...');

  const members = [
    {
      name: 'Christian Schilling',
      title: 'GDPR Specialist & Legal Coordinator',
      email: 'christian.schilling@hellofresh.de',
      department: 'Legal',
      role: 'lead' as const,
      specialties: [
        'DPA Communication',
        'Technical Assessment',
        'Legal Analysis',
        'DACH Compliance',
        'Nordic Regulations',
        'Risk Assessment'
      ],
      markets: ['DE', 'AT', 'CH', 'BE', 'NL', 'LU', 'SE', 'DK', 'NO', 'FR'],
      isActive: true,
    },
    {
      name: 'Tiphaine Legal',
      title: 'Belgium DPA Liaison',
      email: 'tiphaine.legal@hellofresh.de',
      department: 'Legal',
      role: 'specialist' as const,
      specialties: [
        'Belgium GDPR',
        'DPA Communication',
        'Legal Analysis',
        'Customer Communication'
      ],
      markets: ['BE', 'NL', 'LU', 'FR'],
      isActive: true,
    },
    {
      name: 'Tech Team Lead',
      title: 'Senior Technical Lead',
      email: 'tech.lead@hellofresh.de',
      department: 'Tech',
      role: 'member' as const,
      specialties: [
        'Technical Assessment',
        'Incident Documentation',
        'System Analysis',
        'Data Recovery'
      ],
      markets: ['DE', 'AT', 'CH', 'BE', 'NL', 'LU', 'SE', 'DK', 'NO', 'FR'],
      isActive: true,
    },
    {
      name: 'Security Team Lead',
      title: 'Head of Security',
      email: 'security.lead@hellofresh.de',
      department: 'Security',
      role: 'specialist' as const,
      specialties: [
        'Security Assessment',
        'Risk Assessment',
        'Technical Assessment',
        'Incident Response'
      ],
      markets: ['DE', 'AT', 'CH', 'BE', 'NL', 'LU', 'SE', 'DK', 'NO', 'FR'],
      isActive: true,
    },
    {
      name: 'Compliance Officer DACH',
      title: 'Senior Compliance Officer',
      email: 'compliance.dach@hellofresh.de',
      department: 'Compliance',
      role: 'member' as const,
      specialties: [
        'DACH Compliance',
        'Legal Analysis',
        'Customer Communication',
        'Risk Assessment'
      ],
      markets: ['DE', 'AT', 'CH'],
      isActive: true,
    },
    {
      name: 'Nordic Legal Specialist',
      title: 'Legal Counsel Nordic',
      email: 'nordic.legal@hellofresh.de',
      department: 'Legal',
      role: 'specialist' as const,
      specialties: [
        'Nordic Regulations',
        'DPA Communication',
        'Legal Analysis'
      ],
      markets: ['SE', 'DK', 'NO'],
      isActive: true,
    }
  ];

  const createdBy = 'system@hellofresh.de';
  const results = [];

  for (const member of members) {
    try {
      const id = await createTaskForceMember(member, createdBy);
      console.log(`✅ Created: ${member.name} (ID: ${id})`);
      results.push({ ...member, id });
    } catch (error) {
      console.error(`❌ Failed to create ${member.name}:`, error);
    }
  }

  console.log(`\n🎉 Successfully seeded ${results.length}/${members.length} Task-Force Members`);
  
  // Print summary
  console.log('\n📊 Summary by Role:');
  console.log(`  - Leads: ${results.filter(m => m.role === 'lead').length}`);
  console.log(`  - Specialists: ${results.filter(m => m.role === 'specialist').length}`);
  console.log(`  - Members: ${results.filter(m => m.role === 'member').length}`);

  console.log('\n📊 Summary by Department:');
  const departments = [...new Set(results.map(m => m.department))];
  departments.forEach(dept => {
    console.log(`  - ${dept}: ${results.filter(m => m.department === dept).length}`);
  });

  console.log('\n🌍 Market Coverage:');
  const allMarkets = [...new Set(results.flatMap(m => m.markets))];
  console.log(`  - Total Markets Covered: ${allMarkets.length}`);
  console.log(`  - Markets: ${allMarkets.sort().join(', ')}`);

  return results;
}

// Only run if this script is executed directly
if (require.main === module) {
  seedTaskForceMembers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedTaskForceMembers };