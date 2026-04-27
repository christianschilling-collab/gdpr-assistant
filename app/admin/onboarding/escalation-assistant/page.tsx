'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';

interface POC {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone?: string;
  specialties: string[];
  markets: string[];
  escalationType: string[];
  availability: 'always' | 'business_hours' | 'emergency_only';
}

interface EscalationScenario {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  recommendedPOCs: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  maxResponseTime: string;
  tools: string[];
}

export default function EscalationAssistantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'poc' | 'scenarios' | 'assistant'>('poc');
  const [pocList, setPocList] = useState<POC[]>([]);
  const [scenarios, setScenarios] = useState<EscalationScenario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [assistantStep, setAssistantStep] = useState(0);
  const [assistantAnswers, setAssistantAnswers] = useState<string[]>([]);

  // POC Directory based on GDPR Team Hub structure
  const gdprPocDirectory: POC[] = [
    {
      id: 'christian',
      name: 'Christian Schilling',
      role: 'Data Protection Expert',
      department: 'Legal',
      email: 'christian.schilling@hellofresh.de',
      specialties: ['GDPR Compliance', 'Data Deletion', 'DSARs', 'Legal Escalations'],
      markets: ['DACH', 'FR', 'NORDICS', 'BNLX'],
      escalationType: ['legal', 'dpo', 'incident'],
      availability: 'business_hours'
    },
    {
      id: 'kirsten',
      name: 'Kirsten Kievid',
      role: 'Director Customer Care',
      department: 'Customer Care',
      email: 'kirsten.kievid@hellofresh.de',
      specialties: ['Customer Care Strategy', 'BPO Management', 'Escalations'],
      markets: ['DACH', 'BNLX', 'NORDICS', 'FR'],
      escalationType: ['management', 'customer_care', 'bpo'],
      availability: 'business_hours'
    },
    {
      id: 'legal_team',
      name: 'Legal Team',
      role: 'Legal Department',
      department: 'Legal',
      email: 'legal@hellofresh.de',
      specialties: ['Legal Review', 'Police Inquiries', 'Death Notices', 'Court Orders'],
      markets: ['ALL'],
      escalationType: ['legal', 'police', 'court_order', 'death_notice'],
      availability: 'business_hours'
    },
    {
      id: 'it_helpdesk',
      name: 'IT Global Helpdesk',
      role: 'IT Support',
      department: 'IT',
      email: 'it-helpdesk@hellofresh.de',
      specialties: ['System Access', 'Technical Issues', 'Data Recovery'],
      markets: ['ALL'],
      escalationType: ['technical', 'system_access', 'data_recovery'],
      availability: 'always'
    },
    {
      id: 'hr_team',
      name: 'HR Team',
      role: 'Human Resources',
      department: 'HR',
      email: 'hr@hellofresh.de', 
      specialties: ['Former Employee Data', 'Employee GDPR Requests', 'Employment Records'],
      markets: ['ALL'],
      escalationType: ['employee', 'former_employee'],
      availability: 'business_hours'
    }
  ];

  // Escalation Scenarios based on GDPR Hub workflows
  const escalationScenarios: EscalationScenario[] = [
    {
      id: 'police_inquiry',
      title: 'Police Inquiry / Law Enforcement Request',
      description: 'Law enforcement requesting customer data or information',
      criteria: [
        'Request comes from police/law enforcement',
        'Official documentation provided',
        'Customer data requested for investigation'
      ],
      recommendedPOCs: ['legal_team', 'christian'],
      urgency: 'high',
      maxResponseTime: '2 hours',
      tools: ['Jira', 'Legal Review', 'Incident Log']
    },
    {
      id: 'death_notice',
      title: 'Death Notice Processing',
      description: 'Request involving deceased customer account',
      criteria: [
        'Death certificate provided',
        'Request from family member/executor',
        'Account data of deceased person involved'
      ],
      recommendedPOCs: ['legal_team', 'christian'],
      urgency: 'medium',
      maxResponseTime: '1 business day',
      tools: ['Jira', 'OWL', 'Legal Review']
    },
    {
      id: 'former_employee',
      title: 'Former Employee Data Request',
      description: 'Ex-HelloFresh employee requesting their employment data',
      criteria: [
        'Request from former employee',
        'Employment data requested',
        'HR systems involved'
      ],
      recommendedPOCs: ['hr_team', 'christian'],
      urgency: 'medium',
      maxResponseTime: '3 business days',
      tools: ['Jira', 'HR Systems', 'Employee Records']
    },
    {
      id: 'complex_dsar',
      title: 'Complex DSAR (Multiple Systems)',
      description: 'Data Subject Access Request involving multiple systems/departments',
      criteria: [
        'Data spans multiple systems',
        'Technical complexity high',
        'Requires IT involvement for data extraction'
      ],
      recommendedPOCs: ['christian', 'it_helpdesk'],
      urgency: 'medium',
      maxResponseTime: '5 business days',
      tools: ['Jira', 'OWL', 'PureCloud/Genesys', 'DSAR Google Drive', 'IT Systems']
    },
    {
      id: 'customer_complaint',
      title: 'Serious Customer Complaint',
      description: 'Customer complaint about GDPR violation or data misuse',
      criteria: [
        'Customer alleges GDPR violation',
        'Potential regulatory risk',
        'Media/public attention risk'
      ],
      recommendedPOCs: ['kirsten', 'christian', 'legal_team'],
      urgency: 'high',
      maxResponseTime: '4 hours',
      tools: ['Jira', 'Incident Log', 'Management Review']
    },
    {
      id: 'system_breach',
      title: 'Suspected Data Breach',
      description: 'Potential data breach or unauthorized access to customer data',
      criteria: [
        'Unauthorized access suspected',
        'Customer data potentially compromised',
        'System security incident'
      ],
      recommendedPOCs: ['it_helpdesk', 'legal_team', 'christian'],
      urgency: 'critical',
      maxResponseTime: '30 minutes',
      tools: ['Incident Log', 'IT Security', 'Legal Review', 'Management Alert']
    },
    {
      id: 'bpo_issue',
      title: 'BPO/Service Partner Issue',
      description: 'Issue with external service partner handling GDPR requests',
      criteria: [
        'BPO made error in GDPR processing',
        'Service partner non-compliance',
        'Customer complaint about BPO handling'
      ],
      recommendedPOCs: ['kirsten', 'christian'],
      urgency: 'medium',
      maxResponseTime: '1 business day',
      tools: ['Jira', 'BPO Management', 'Compliance Review']
    }
  ];

  // Escalation Assistant Questions
  const assistantQuestions = [
    {
      question: "What type of situation are you dealing with?",
      options: [
        "Police/Law Enforcement Request",
        "Customer Complaint",
        "Death Notice",
        "Former Employee Request", 
        "Technical/System Issue",
        "BPO/Partner Problem",
        "Other/Unsure"
      ]
    },
    {
      question: "How urgent is this situation?",
      options: [
        "Critical - Immediate action needed",
        "High - Same day response needed",
        "Medium - Can wait 1-2 business days",
        "Low - No immediate rush"
      ]
    },
    {
      question: "Which markets are affected?",
      options: [
        "DACH (Germany, Austria, Switzerland)",
        "France",
        "NORDICS (Denmark, Sweden, Norway)",
        "BNLX (Belgium, Netherlands, Luxembourg)",
        "Multiple Markets",
        "Not Sure"
      ]
    }
  ];

  useEffect(() => {
    if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
      router.push('/cases');
      return;
    }
    
    setPocList(gdprPocDirectory);
    setScenarios(escalationScenarios);
  }, [user, router]);

  const filteredPOCs = pocList.filter(poc => {
    const matchesSearch = !searchTerm || 
      poc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poc.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poc.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === 'all' || poc.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  const departments = [...new Set(pocList.map(poc => poc.department))];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'always': return 'text-green-600 bg-green-50';
      case 'business_hours': return 'text-blue-600 bg-blue-50';
      case 'emergency_only': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleAssistantNext = (selectedOption: string) => {
    setAssistantAnswers([...assistantAnswers, selectedOption]);
    setAssistantStep(assistantStep + 1);
  };

  const getRecommendation = () => {
    // Simple logic to recommend POCs based on answers
    const situation = assistantAnswers[0];
    const urgency = assistantAnswers[1];
    
    let recommendedScenario = scenarios.find(s => 
      s.title.toLowerCase().includes(situation.toLowerCase())
    );
    
    if (!recommendedScenario && situation.includes('Police')) {
      recommendedScenario = scenarios.find(s => s.id === 'police_inquiry');
    } else if (!recommendedScenario && situation.includes('Complaint')) {
      recommendedScenario = scenarios.find(s => s.id === 'customer_complaint');
    } else if (!recommendedScenario && situation.includes('Death')) {
      recommendedScenario = scenarios.find(s => s.id === 'death_notice');
    }
    
    return recommendedScenario || scenarios[0];
  };

  if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Escalation Assistant</h1>
          <p className="text-gray-600 mt-1">POC Directory and escalation decision support - based on GDPR Team Hub</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab('poc')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'poc'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                POC Directory
              </button>
              <button
                onClick={() => setSelectedTab('scenarios')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'scenarios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Escalation Scenarios
              </button>
              <button
                onClick={() => {
                  setSelectedTab('assistant');
                  setAssistantStep(0);
                  setAssistantAnswers([]);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'assistant'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Decision Assistant
              </button>
            </nav>
          </div>
        </div>

        {/* POC Directory Tab */}
        {selectedTab === 'poc' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Point of Contact Directory</h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Search POCs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPOCs.map((poc) => (
                  <div key={poc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{poc.name}</h3>
                        <p className="text-sm text-gray-600">{poc.role}</p>
                        <p className="text-sm text-blue-600">{poc.department}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getAvailabilityColor(poc.availability)}`}>
                        {poc.availability.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">📧</span>
                        <a href={`mailto:${poc.email}`} className="text-blue-600 hover:underline">
                          {poc.email}
                        </a>
                      </div>
                      {poc.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">📞</span>
                          <span>{poc.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Specialties:</p>
                      <div className="flex flex-wrap gap-1">
                        {poc.specialties.map((specialty, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Markets:</p>
                      <div className="flex flex-wrap gap-1">
                        {poc.markets.map((market, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            {market}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Escalation Scenarios Tab */}
        {selectedTab === 'scenarios' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Escalation Scenarios</h2>
              <p className="text-sm text-gray-600 mt-1">When and how to escalate different types of GDPR issues</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{scenario.title}</h3>
                        <p className="text-gray-600 mt-1">{scenario.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded border text-sm ${getUrgencyColor(scenario.urgency)}`}>
                          {scenario.urgency.toUpperCase()}
                        </span>
                        <div className="text-sm text-gray-600 mt-1">
                          Response: {scenario.maxResponseTime}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Escalation Criteria:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {scenario.criteria.map((criteria, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Contact:</h4>
                        <div className="space-y-2">
                          {scenario.recommendedPOCs.map((pocId) => {
                            const poc = pocList.find(p => p.id === pocId);
                            return poc ? (
                              <div key={pocId} className="text-sm">
                                <div className="font-medium text-gray-900">{poc.name}</div>
                                <div className="text-blue-600">{poc.email}</div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Required Tools:</h4>
                        <div className="flex flex-wrap gap-1">
                          {scenario.tools.map((tool, index) => (
                            <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Decision Assistant Tab */}
        {selectedTab === 'assistant' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Escalation Decision Assistant</h2>
              <p className="text-sm text-gray-600 mt-1">Get personalized escalation recommendations</p>
            </div>
            <div className="p-8">
              {assistantStep < assistantQuestions.length ? (
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <span>Step {assistantStep + 1} of {assistantQuestions.length}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${((assistantStep + 1) / assistantQuestions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {assistantQuestions[assistantStep].question}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {assistantQuestions[assistantStep].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAssistantNext(option)}
                        className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Recommendation Ready</h3>
                    <p className="text-gray-600">Based on your answers, here's what you should do:</p>
                  </div>

                  {(() => {
                    const recommendation = getRecommendation();
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-bold text-blue-900 mb-3">{recommendation.title}</h4>
                        <p className="text-blue-800 mb-4">{recommendation.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-blue-900 mb-2">Contact Immediately:</h5>
                            {recommendation.recommendedPOCs.map((pocId) => {
                              const poc = pocList.find(p => p.id === pocId);
                              return poc ? (
                                <div key={pocId} className="mb-2">
                                  <div className="font-medium text-blue-900">{poc.name}</div>
                                  <a href={`mailto:${poc.email}`} className="text-blue-700 hover:underline text-sm">
                                    {poc.email}
                                  </a>
                                </div>
                              ) : null;
                            })}
                          </div>
                          <div>
                            <h5 className="font-medium text-blue-900 mb-2">Response Time:</h5>
                            <div className="text-blue-800">{recommendation.maxResponseTime}</div>
                            <h5 className="font-medium text-blue-900 mt-4 mb-2">Tools Needed:</h5>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.tools.map((tool, index) => (
                                <span key={index} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="text-center">
                    <button
                      onClick={() => {
                        setAssistantStep(0);
                        setAssistantAnswers([]);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Start New Assessment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}