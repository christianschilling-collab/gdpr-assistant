'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import { createSystemConfig, getAllSystemConfigs } from '@/lib/firebase/onboarding';

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

export default function SeedSystemsPage() {
  const { user } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResults, setSeedResults] = useState<{
    created: number;
    errors: number;
    details: string[];
  } | null>(null);

  if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Admin access required for system seeding.</p>
        </div>
      </div>
    );
  }

  const handleSeedSystems = async () => {
    setIsSeeding(true);
    setSeedResults(null);
    
    const results = {
      created: 0,
      errors: 0,
      details: []
    };

    try {
      // Check existing systems first
      const existingSystems = await getAllSystemConfigs();
      console.log(`Found ${existingSystems.length} existing systems`);
      
      for (const system of DEFAULT_SYSTEMS) {
        try {
          const displayName = system.organization ? `${system.name} (${system.organization})` : system.name;
          
          // Check if system already exists
          const exists = existingSystems.find(s => 
            s.name === system.name && 
            (s.organization || '') === (system.organization || '')
          );
          
          if (exists) {
            results.details.push(`⏭️ Skipped existing system: ${displayName}`);
            continue;
          }
          
          const systemId = await createSystemConfig({
            name: system.name,
            organization: system.organization,
            priority: system.priority,
            slaHours: system.slaHours,
            description: system.description,
            contactInfo: system.contactInfo,
            isActive: true
          });
          
          results.details.push(`✅ Created system: ${displayName} (ID: ${systemId})`);
          results.created++;
        } catch (error) {
          const displayName = system.organization ? `${system.name} (${system.organization})` : system.name;
          results.details.push(`❌ Failed to create system: ${displayName} - ${(error as Error).message}`);
          results.errors++;
        }
      }
      
      setSeedResults(results);
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `<div class="flex items-center gap-2"><span>🌱</span><span>Seed completed! ${results.created} systems created</span></div>`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 4000);
      
    } catch (error) {
      console.error('Seed error:', error);
      results.details.push(`❌ General error: ${(error as Error).message}`);
      results.errors++;
      setSeedResults(results);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `<div class="flex items-center gap-2"><span>❌</span><span>Seed failed: ${(error as Error).message}</span></div>`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 4000);
    } finally {
      setIsSeeding(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">GDPR Systems Database Seed</h1>
          <p className="mt-2 text-gray-600">
            Initialize the system configuration database with default GDPR systems
          </p>
        </div>

        {/* Action Card */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Database Initialization</h2>
          </div>
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">What this will do:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Create {DEFAULT_SYSTEMS.length} default GDPR system configurations</li>
                <li>• Skip systems that already exist (safe to run multiple times)</li>
                <li>• Include both HelloFresh and Factor DE variants where applicable</li>
                <li>• Set appropriate priority levels and SLA hours</li>
              </ul>
            </div>
            
            <button
              onClick={handleSeedSystems}
              disabled={isSeeding}
              className={`px-6 py-3 rounded-lg font-medium ${
                isSeeding
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSeeding ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                  Seeding Systems...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  🌱 Initialize System Configurations
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Preview of Systems */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Systems to be Created</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {DEFAULT_SYSTEMS.map((system, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="font-medium text-sm mb-2">
                    {system.organization ? `${system.name} (${system.organization})` : system.name}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mb-2 ${getPriorityColor(system.priority)}`}>
                    {system.priority} • {system.slaHours}h SLA
                  </div>
                  <div className="text-xs text-gray-600">
                    {system.description}
                  </div>
                  {system.contactInfo && (
                    <div className="text-xs text-gray-500 mt-1">
                      📧 {system.contactInfo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {seedResults && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Seed Results</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{seedResults.created}</div>
                  <div className="text-sm text-green-800">Created</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{seedResults.errors}</div>
                  <div className="text-sm text-red-800">Errors</div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Details:</h3>
                <div className="space-y-1">
                  {seedResults.details.map((detail, index) => (
                    <div key={index} className="text-sm font-mono">
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <a
                  href="/admin/system-config"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  ⚙️ View System Configurations
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}