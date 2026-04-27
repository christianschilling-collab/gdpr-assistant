'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';

interface DecisionNode {
  id: string;
  question: string;
  options: {
    text: string;
    nextId?: string;
    result?: {
      type: string;
      description: string;
      actions: string[];
      tools: string[];
    };
  }[];
}

export default function ClassificationTreePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentNodeId, setCurrentNodeId] = useState('start');
  const [path, setPath] = useState<string[]>(['start']);
  const [showExplanation, setShowExplanation] = useState(false);

  // GDPR Classification Decision Tree based on GDPR Team Hub
  const decisionTree: Record<string, DecisionNode> = {
    start: {
      id: 'start',
      question: 'What type of request did you receive?',
      options: [
        { text: 'Customer Request (from registered HelloFresh customer)', nextId: 'customer_type' },
        { text: 'Special Case (police inquiry, former employee, death notice)', nextId: 'special_type' },
        { text: 'Non-Customer Request (ad revocation, complaint)', nextId: 'non_customer_type' },
        { text: 'Routing Issue (Non-DACH market)', nextId: 'routing' },
        { text: 'Not sure - need help deciding', nextId: 'help_classification' }
      ]
    },
    customer_type: {
      id: 'customer_type',
      question: 'What does the customer want?',
      options: [
        {
          text: 'Delete my account/data (Deletion Request)',
          result: {
            type: 'Customer Deletion Request',
            description: 'Customer wants their account and personal data deleted',
            actions: [
              'Process via MineOS deletion system',
              'Check if autopilot handled or flagged exception',
              'Verify customer identity in OWL',
              'Complete deletion within 30 days'
            ],
            tools: ['MineOS', 'OWL', 'GDPR Assistant']
          }
        },
        {
          text: 'Stop marketing emails (Ad Revocation)',
          result: {
            type: 'Customer Ad Revocation',
            description: 'Customer wants to unsubscribe from marketing communications',
            actions: [
              'Update preferences in OWL customer system',
              'Add to marketing opt-out list',
              'Confirm unsubscribe within 3 days'
            ],
            tools: ['OWL', 'Marketing System']
          }
        },
        {
          text: 'Get copy of my data (DSAR - Data Subject Access Request)',
          result: {
            type: 'DSAR - Data Subject Access Request',
            description: 'Customer requests copy of their personal data',
            actions: [
              'Create Jira ticket for DSAR processing',
              'Verify customer identity',
              'Extract data from all systems (OWL, PureCloud, etc.)',
              'Create encrypted ZIP file',
              'Upload to DSAR Google Drive (auto-deletes after 6 weeks)',
              'Send secure download link to customer'
            ],
            tools: ['Jira', 'OWL', 'PureCloud/Genesys', 'DSAR Google Drive']
          }
        },
        {
          text: 'Complaint or Escalation',
          result: {
            type: 'Customer Complaint/Escalation',
            description: 'Customer complaint about data handling or GDPR violation',
            actions: [
              'Create Jira ticket for tracking',
              'Log in Incident Log if serious case',
              'Check Escalation Criteria',
              'Contact appropriate POC from directory',
              'Monitor Jira Deadline Filter (30-day approach)'
            ],
            tools: ['Jira', 'Incident Log', 'POC Directory', 'Jira Deadline Filter']
          }
        }
      ]
    },
    special_type: {
      id: 'special_type',
      question: 'What type of special case?',
      options: [
        {
          text: 'Police Inquiry (law enforcement request)',
          result: {
            type: 'Police Inquiry',
            description: 'Law enforcement requesting customer data',
            actions: [
              'DO NOT process immediately',
              'Verify legitimate police request with proper documentation',
              'Escalate to Legal team via POC Directory',
              'Create Jira ticket for tracking',
              'Log as serious case in Incident Log'
            ],
            tools: ['Jira', 'POC Directory', 'Incident Log']
          }
        },
        {
          text: 'Former Employee (ex-staff data request)',
          result: {
            type: 'Former Employee Request',
            description: 'Former HelloFresh employee requesting their data',
            actions: [
              'Verify employment history',
              'Check HR systems for data location',
              'Create Jira ticket',
              'Coordinate with HR department',
              'Follow employee data retention policies'
            ],
            tools: ['Jira', 'HR Systems', 'POC Directory']
          }
        },
        {
          text: 'Death Notice (deceased customer)',
          result: {
            type: 'Death Notice Processing',
            description: 'Request regarding deceased customer account',
            actions: [
              'Verify death certificate documentation',
              'Check relationship of requester to deceased',
              'Create Jira ticket for sensitive handling',
              'Coordinate with Legal via POC Directory',
              'Process deletion or data transfer as appropriate'
            ],
            tools: ['Jira', 'OWL', 'POC Directory', 'Legal Review']
          }
        },
        {
          text: 'Postal Reply (physical mail, no email)',
          result: {
            type: 'Postal Reply Processing',
            description: 'Physical mail response required (no email available)',
            actions: [
              'Add address to DP Blacklist (postal advertising blocklist)',
              'Prepare physical response letter',
              'Update customer communication preferences',
              'Mail response within required timeframe'
            ],
            tools: ['DP Blacklist', 'OWL', 'Physical Mail System']
          }
        }
      ]
    },
    non_customer_type: {
      id: 'non_customer_type',
      question: 'What does the non-customer want?',
      options: [
        {
          text: 'Stop email marketing (Non-Customer Ad Revocation)',
          result: {
            type: 'Non-Customer Ad Revocation',
            description: 'Non-customer wants to stop receiving marketing emails',
            actions: [
              'Add email to Stop Email Sheet',
              'Update Google Sheet with market column',
              'Add to email suppression list',
              'Confirm opt-out within 3 days'
            ],
            tools: ['Stop Email Sheet', 'Email Marketing System']
          }
        },
        {
          text: 'General complaint about HelloFresh',
          result: {
            type: 'Non-Customer Complaint',
            description: 'Complaint from non-customer about company practices',
            actions: [
              'Create Jira ticket for tracking',
              'Check if GDPR-related complaint',
              'Route to appropriate team via POC Directory',
              'Monitor response timeline'
            ],
            tools: ['Jira', 'POC Directory']
          }
        }
      ]
    },
    routing: {
      id: 'routing',
      question: 'Which market is the request from?',
      options: [
        {
          text: 'Non-DACH Market (FR, NORDICS, BNLX, US, etc.)',
          result: {
            type: 'Non-DACH Routing',
            description: 'Request from market outside DACH region',
            actions: [
              'Use Non-DACH Routing guide',
              'Forward to appropriate regional GDPR team',
              'Update request status with routing information',
              'Provide confirmation to original requester'
            ],
            tools: ['Non-DACH Routing Guide', 'Regional Contact List']
          }
        }
      ]
    },
    help_classification: {
      id: 'help_classification',
      question: 'What information do you have about the request?',
      options: [
        { text: 'Start over with guided questions', nextId: 'start' },
        {
          text: 'Need manager assistance',
          result: {
            type: 'Manager Escalation',
            description: 'Complex case requiring manager review',
            actions: [
              'Check Escalation Criteria guide',
              'Contact POC Directory for appropriate escalation',
              'Create Jira ticket documenting uncertainty',
              'Schedule review with team lead'
            ],
            tools: ['Escalation Criteria', 'POC Directory', 'Jira']
          }
        }
      ]
    }
  };

  if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
    router.push('/cases');
    return null;
  }

  const currentNode = decisionTree[currentNodeId];
  const hasResult = currentNode?.options.some(option => option.result);

  const handleOptionClick = (option: DecisionNode['options'][0]) => {
    if (option.nextId) {
      setCurrentNodeId(option.nextId);
      setPath([...path, option.nextId]);
      setShowExplanation(false);
    } else if (option.result) {
      setShowExplanation(true);
    }
  };

  const reset = () => {
    setCurrentNodeId('start');
    setPath(['start']);
    setShowExplanation(false);
  };

  const goBack = () => {
    if (path.length > 1) {
      const newPath = path.slice(0, -1);
      setPath(newPath);
      setCurrentNodeId(newPath[newPath.length - 1]);
      setShowExplanation(false);
    }
  };

  const resultOption = currentNode?.options.find(option => option.result);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Classification Decision Tree</h1>
          <p className="text-gray-600 mt-1">Interactive GDPR request classification training - based on GDPR Team Hub</p>
        </div>

        {/* Progress Path */}
        <div className="bg-white rounded-lg p-4 mb-6 border">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Path:</span>
            {path.map((nodeId, index) => (
              <div key={nodeId} className="flex items-center">
                {index > 0 && <span className="mx-2">→</span>}
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {nodeId === 'start' ? 'Start' : decisionTree[nodeId]?.question.split(' ').slice(0, 3).join(' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {!showExplanation ? (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentNode?.question}
              </h2>
              
              <div className="space-y-3">
                {currentNode?.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <span className="text-gray-900">{option.text}</span>
                    {option.result && (
                      <div className="text-sm text-blue-600 mt-1">
                        → This will show the classification result
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            resultOption?.result && (
              <div className="p-8">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h2 className="text-2xl font-bold text-gray-900">Classification Result</h2>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-bold text-green-800 mb-2">
                      {resultOption.result.type}
                    </h3>
                    <p className="text-green-700">
                      {resultOption.result.description}
                    </p>
                  </div>
                </div>

                {/* Action Steps */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Required Actions:</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {resultOption.result.actions.map((action, index) => (
                      <li key={index} className="text-gray-700">{action}</li>
                    ))}
                  </ol>
                </div>

                {/* Tools Needed */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Tools/Systems Required:</h4>
                  <div className="flex flex-wrap gap-2">
                    {resultOption.result.tools.map((tool, index) => (
                      <span 
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Practice Mode */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">🎓 Training Note</h4>
                  <p className="text-blue-800 text-sm">
                    Practice this classification by working through similar scenarios. 
                    Each request type has specific SLAs and processing requirements from the GDPR Team Hub.
                  </p>
                </div>
              </div>
            )
          )}

          {/* Navigation */}
          <div className="border-t bg-gray-50 px-8 py-4 flex justify-between">
            <button
              onClick={goBack}
              disabled={path.length <= 1}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Over
            </button>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Reference - GDPR Request Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Customer Requests:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Deletion (→ MineOS)</li>
                <li>• Ad Revocation (→ OWL)</li>
                <li>• DSAR (→ Jira + DSAR Drive)</li>
                <li>• Complaint (→ Jira + Escalation)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Special Cases:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Police Inquiry (→ Legal)</li>
                <li>• Former Employee (→ HR + Jira)</li>
                <li>• Death Notice (→ Legal + Jira)</li>
                <li>• Postal Reply (→ DP Blacklist)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}