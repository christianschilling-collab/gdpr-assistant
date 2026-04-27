'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface POC {
  name: string;
  role: string;
  email: string;
  markets: string[];
  expertise: string[];
  slackId?: string;
  urgentContact?: boolean;
}

interface EscalationScenario {
  id: string;
  title: string;
  description: string;
  triggers: string[];
  recommendedPOC: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string;
}

export default function PublicEscalationAssistantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // POC Directory based on GDPR Team Hub
  const pocDirectory: POC[] = [
    {
      name: 'Christian Schilling',
      role: 'GDPR Lead - DACH & Nordics',
      email: 'christian.schilling@hellofresh.de',
      markets: ['DACH', 'Nordics'],
      expertise: ['Policy', 'Training', 'Complex Cases', 'Technical Integration'],
      slackId: '@christian.schilling',
      urgentContact: true
    },
    {
      name: 'Tiphaine Saulnier',
      role: 'GDPR Specialist - FR/BNLX',
      email: 'tiphaine.saulnier@hellofresh.de',
      markets: ['FR', 'BNLX'],
      expertise: ['Customer Requests', 'DSAR Processing', 'Regional Compliance'],
      slackId: '@tiphaine.saulnier'
    },
    {
      name: 'Legal Team',
      role: 'Legal Department',
      email: 'legal@hellofresh.de',
      markets: ['All'],
      expertise: ['Police Inquiries', 'Complex Legal Issues', 'Regulatory Response'],
      urgentContact: true
    },
    {
      name: 'Data Engineering',
      role: 'Technical Systems',
      email: 'data-engineering@hellofresh.de',
      markets: ['All'],
      expertise: ['MineOS Issues', 'Technical Deletions', 'System Integration']
    },
    {
      name: 'Customer Care Management',
      role: 'CC Leadership',
      email: 'cc-management@hellofresh.de',
      markets: ['All'],
      expertise: ['Process Escalations', 'Policy Questions', 'Training Issues']
    },
    {
      name: 'Product Security',
      role: 'Security Team',
      email: 'security@hellofresh.de',
      markets: ['All'],
      expertise: ['Data Breaches', 'Security Incidents', 'Privacy Impact Assessment']
    }
  ];

  // Escalation Scenarios
  const escalationScenarios: EscalationScenario[] = [
    {
      id: 'police_inquiry',
      title: 'Police Inquiry / Law Enforcement',
      description: 'Received request from police or law enforcement for customer data',
      triggers: [
        'Email from law enforcement',
        'Official request for customer information',
        'Court order or subpoena',
        'Police investigation requiring data access'
      ],
      recommendedPOC: ['Legal Team', 'Christian Schilling'],
      urgencyLevel: 'critical',
      timeframe: 'Immediate (within 1 hour)'
    },
    {
      id: 'data_breach',
      title: 'Potential Data Breach',
      description: 'Suspicion or confirmation of unauthorized access to personal data',
      triggers: [
        'System security alert',
        'Customer reports unauthorized access',
        'Suspicious data access patterns',
        'External notification of data exposure'
      ],
      recommendedPOC: ['Product Security', 'Legal Team', 'Christian Schilling'],
      urgencyLevel: 'critical',
      timeframe: 'Immediate (within 30 minutes)'
    },
    {
      id: 'deletion_issue',
      title: 'MineOS Deletion Problem',
      description: 'Customer deletion failed or flagged as exception in MineOS',
      triggers: [
        'MineOS exception report',
        'Customer complaining deletion not processed',
        'Technical error in deletion system',
        'Deletion failed multiple times'
      ],
      recommendedPOC: ['Data Engineering', 'Christian Schilling'],
      urgencyLevel: 'high',
      timeframe: '24 hours'
    },
    {
      id: 'dsar_complex',
      title: 'Complex DSAR Request',
      description: 'DSAR request with special requirements or complications',
      triggers: [
        'Request involves multiple data sources',
        'Customer disputes provided data',
        'Technical challenge extracting data',
        'Legal complexity in data sharing'
      ],
      recommendedPOC: ['Christian Schilling', 'Legal Team'],
      urgencyLevel: 'medium',
      timeframe: '48 hours'
    },
    {
      id: 'regulatory_inquiry',
      title: 'Regulatory Authority Contact',
      description: 'Contact from DPA or other regulatory body',
      triggers: [
        'Email from Data Protection Authority',
        'Regulatory investigation notice',
        'Audit or compliance request',
        'Official regulatory correspondence'
      ],
      recommendedPOC: ['Legal Team', 'Christian Schilling'],
      urgencyLevel: 'critical',
      timeframe: 'Same day'
    },
    {
      id: 'media_attention',
      title: 'Media/Public Attention',
      description: 'GDPR issue gaining media attention or going viral',
      triggers: [
        'Social media complaints trending',
        'News article about HelloFresh privacy',
        'Customer threatening to go public',
        'Viral complaint about data handling'
      ],
      recommendedPOC: ['Legal Team', 'Christian Schilling', 'Customer Care Management'],
      urgencyLevel: 'high',
      timeframe: '2-4 hours'
    },
    {
      id: 'death_certificate',
      title: 'Death Certificate / Deceased Customer',
      description: 'Request involving deceased customer account',
      triggers: [
        'Family member requests data deletion',
        'Death certificate provided',
        'Estate executor contacting us',
        'Request to access deceased person\'s data'
      ],
      recommendedPOC: ['Legal Team', 'Christian Schilling'],
      urgencyLevel: 'medium',
      timeframe: '48 hours'
    },
    {
      id: 'process_question',
      title: 'Unclear Process/Policy',
      description: 'Unsure about correct procedure for handling request',
      triggers: [
        'Ambiguous request type',
        'No clear process documented',
        'Multiple possible approaches',
        'New type of request never seen'
      ],
      recommendedPOC: ['Christian Schilling', 'Customer Care Management'],
      urgencyLevel: 'low',
      timeframe: 'Next business day'
    }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredScenarios = escalationScenarios.filter(scenario =>
    scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scenario.triggers.some(trigger => trigger.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedScenarioData = escalationScenarios.find(s => s.id === selectedScenario);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Escalation Assistant</h1>
              <p className="text-gray-600 mt-1">Know who to contact for complex GDPR cases - based on GDPR Team Hub</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Training
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scenario Selector */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Find Your Scenario</h2>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search scenarios, triggers, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              />

              {/* Scenario List */}
              <div className="space-y-3">
                {filteredScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`w-full p-4 text-left border rounded-lg transition-all ${
                      selectedScenario === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{scenario.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(scenario.urgencyLevel)}`}>
                        {scenario.urgencyLevel.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scenario Details & POC Info */}
          <div className="space-y-6">
            {selectedScenarioData ? (
              <>
                {/* Scenario Details */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{selectedScenarioData.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(selectedScenarioData.urgencyLevel)}`}>
                      {selectedScenarioData.urgencyLevel.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{selectedScenarioData.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Common Triggers:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {selectedScenarioData.triggers.map((trigger, index) => (
                        <li key={index}>{trigger}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600">⏰</span>
                      <span className="font-medium text-blue-900">Response Timeframe</span>
                    </div>
                    <p className="text-blue-800">{selectedScenarioData.timeframe}</p>
                  </div>
                </div>

                {/* Recommended POCs */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Who to Contact</h3>
                  <div className="space-y-4">
                    {selectedScenarioData.recommendedPOC.map((pocName, index) => {
                      const poc = pocDirectory.find(p => p.name === pocName);
                      if (!poc) return null;
                      
                      return (
                        <div key={index} className={`border rounded-lg p-4 ${poc.urgentContact ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">{poc.name}</h4>
                                {poc.urgentContact && (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">URGENT CONTACT</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{poc.role}</p>
                              <div className="text-sm">
                                <div className="mb-1">
                                  <strong>Email:</strong> <a href={`mailto:${poc.email}`} className="text-blue-600 hover:underline">{poc.email}</a>
                                </div>
                                {poc.slackId && (
                                  <div className="mb-1">
                                    <strong>Slack:</strong> <span className="text-blue-600">{poc.slackId}</span>
                                  </div>
                                )}
                                <div>
                                  <strong>Markets:</strong> {poc.markets.join(', ')}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <strong className="text-xs text-gray-500">EXPERTISE:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {poc.expertise.map((skill, skillIndex) => (
                                <span key={skillIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg text-gray-500 mb-2">Select a Scenario</h3>
                <p className="text-gray-400">Choose an escalation scenario to see recommended contacts and procedures</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🚨 Emergency Escalation Priority</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-bold text-red-900 mb-2">CRITICAL (Immediate)</h4>
              <ul className="text-red-800 space-y-1">
                <li>• Police inquiries</li>
                <li>• Data breaches</li>
                <li>• Regulatory contact</li>
              </ul>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="font-bold text-orange-900 mb-2">HIGH (2-24 hours)</h4>
              <ul className="text-orange-800 space-y-1">
                <li>• MineOS failures</li>
                <li>• Media attention</li>
                <li>• System issues</li>
              </ul>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-bold text-yellow-900 mb-2">MEDIUM (48 hours)</h4>
              <ul className="text-yellow-800 space-y-1">
                <li>• Complex DSAR</li>
                <li>• Death certificates</li>
                <li>• Technical challenges</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-bold text-green-900 mb-2">LOW (Next day)</h4>
              <ul className="text-green-800 space-y-1">
                <li>• Process questions</li>
                <li>• Training needs</li>
                <li>• Documentation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Training Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">🎓 Training Tip</h3>
          <p className="text-blue-800 text-sm">
            When in doubt, escalate early rather than late. It's better to involve the right person sooner than to let a situation worsen. 
            For critical issues (police inquiries, data breaches), always contact multiple POCs simultaneously.
          </p>
        </div>
      </div>
    </div>
  );
}