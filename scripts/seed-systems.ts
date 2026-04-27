/**
 * Seed GDPR System Configurations
 * This script creates the default system configurations based on the original hardcoded list
 */

import { createSystemConfig } from '../lib/firebase/onboarding';

const DEFAULT_SYSTEMS = [
  {
    name: 'Jira',
    priority: 'critical' as const,
    slaHours: 24,
    description: 'GDPR case management and ticket tracking system',
    contactInfo: 'IT Global Helpdesk',
  },
  {
    name: 'MineOS',
    priority: 'critical' as const,
    slaHours: 24,
    description: 'Core platform system for GDPR data processing',
    contactInfo: 'Tech Team',
  },
  {
    name: 'OWL',
    organization: 'HelloFresh',
    priority: 'critical' as const,
    slaHours: 48,
    description: 'HelloFresh data warehouse and analytics platform',
    contactInfo: 'Data Engineering Team',
  },
  {
    name: 'OWL',
    organization: 'Factor DE',
    priority: 'critical' as const,
    slaHours: 48,
    description: 'Factor DE data warehouse and analytics platform',
    contactInfo: 'Data Engineering Team',
  },
  {
    name: 'PureCloud/Genesys',
    priority: 'high' as const,
    slaHours: 48,
    description: 'Customer service and communication platform',
    contactInfo: 'Customer Care Team Lead',
  },
  {
    name: 'Gmail (GDPR Inbox)',
    priority: 'high' as const,
    slaHours: 24,
    description: 'Dedicated GDPR request inbox and email management',
    contactInfo: 'GDPR Team',
  },
  {
    name: 'Abili',
    priority: 'high' as const,
    slaHours: 48,
    description: 'Customer data and profile management system',
    contactInfo: 'Customer Care Team',
  },
  {
    name: 'Stop Email Sheet',
    priority: 'medium' as const,
    slaHours: 72,
    description: 'Email suppression and opt-out management',
    contactInfo: 'Marketing Team',
  },
  {
    name: 'DP Blacklist',
    priority: 'medium' as const,
    slaHours: 72,
    description: 'Data processing blacklist and restriction management',
    contactInfo: 'Legal Team',
  },
  {
    name: 'DSAR Google Drive',
    priority: 'medium' as const,
    slaHours: 48,
    description: 'Data Subject Access Request file storage and processing',
    contactInfo: 'GDPR Team',
  },
  {
    name: 'Comms Portal',
    priority: 'medium' as const,
    slaHours: 72,
    description: 'Communication templates and automated messaging',
    contactInfo: 'Customer Care Team',
  },
];

export async function seedGdprSystems(): Promise<void> {
  console.log('🌱 Starting GDPR Systems seed...');
  
  let created = 0;
  let errors = 0;
  
  for (const system of DEFAULT_SYSTEMS) {
    try {
      const systemId = await createSystemConfig({
        name: system.name,
        organization: system.organization,
        priority: system.priority,
        slaHours: system.slaHours,
        description: system.description,
        contactInfo: system.contactInfo,
        isActive: true
      });
      
      const displayName = system.organization ? `${system.name} (${system.organization})` : system.name;
      console.log(`✅ Created system: ${displayName} (ID: ${systemId})`);
      created++;
    } catch (error) {
      const displayName = system.organization ? `${system.name} (${system.organization})` : system.name;
      console.error(`❌ Failed to create system: ${displayName}`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Seed completed!`);
  console.log(`✅ Created: ${created} systems`);
  console.log(`❌ Errors: ${errors} systems`);
  
  if (errors > 0) {
    throw new Error(`Seed completed with ${errors} errors`);
  }
}

// Export for direct usage
export { DEFAULT_SYSTEMS };