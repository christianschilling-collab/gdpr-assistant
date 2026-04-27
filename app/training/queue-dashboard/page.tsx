'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function PublicQueueDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQueue, setCurrentQueue] = useState('morning');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  const queueData = {
    morning: {
      title: 'Morning Queue Review',
      time: '9:00 AM',
      tasks: [
        {
          id: 1,
          type: 'Customer Deletion',
          priority: 'high',
          customer: 'customer1@example.com',
          status: 'pending',
          sla: '24 hours',
          description: 'MineOS flagged exception - customer has pending refund'
        },
        {
          id: 2,
          type: 'DSAR Request',
          priority: 'medium',
          customer: 'customer2@example.com',
          status: 'in_progress',
          sla: '30 days',
          description: 'Data extraction from OWL completed, PureCloud pending'
        },
        {
          id: 3,
          type: 'Ad Revocation',
          priority: 'low',
          customer: 'customer3@example.com',
          status: 'completed',
          sla: '3 days',
          description: 'Marketing unsubscribe processed successfully'
        }
      ]
    },
    afternoon: {
      title: 'Afternoon Priority Check',
      time: '2:00 PM',
      tasks: [
        {
          id: 4,
          type: 'Police Inquiry',
          priority: 'urgent',
          customer: 'case-ref-12345',
          status: 'pending',
          sla: 'Immediate',
          description: 'Law enforcement request - requires Legal review'
        },
        {
          id: 5,
          type: 'Escalation',
          priority: 'high',
          customer: 'customer4@example.com',
          status: 'pending',
          sla: '2 days',
          description: 'Customer complaint about delayed DSAR response'
        }
      ]
    },
    endofday: {
      title: 'End of Day Wrap-up',
      time: '5:00 PM',
      tasks: [
        {
          id: 6,
          type: 'Daily Summary',
          priority: 'medium',
          customer: 'Team Report',
          status: 'pending',
          sla: 'Daily',
          description: 'Update Jira Dashboard, check deadline filter, log activities'
        }
      ]
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentData = queueData[currentQueue as keyof typeof queueData];

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
              <h1 className="text-3xl font-bold text-gray-900">Queue Dashboard Training</h1>
              <p className="text-gray-600 mt-1">Learn daily GDPR workflow patterns - based on GDPR Team Hub</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Training
            </button>
          </div>
        </div>

        {/* Time Navigation */}
        <div className="bg-white rounded-lg p-4 mb-6 border">
          <div className="flex space-x-4">
            {Object.entries(queueData).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setCurrentQueue(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentQueue === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {data.title}
                <div className="text-xs mt-1 opacity-75">{data.time}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Queue View */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">{currentData.title}</h2>
            <p className="text-gray-600">Typical tasks during {currentData.time} workflow</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {currentData.tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">{task.type}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Customer/Ref:</strong> {task.customer}
                      </div>
                      
                      <p className="text-gray-700 mb-2">{task.description}</p>
                      
                      <div className="text-sm text-blue-600">
                        <strong>SLA:</strong> {task.sla}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Workflow Guide */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Practices */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Daily Workflow Best Practices</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>Morning (9-10 AM):</strong> Check MineOS exceptions, review overnight DSAR progress</li>
              <li>• <strong>Mid-morning:</strong> Process new customer requests by priority (urgent → high → medium)</li>
              <li>• <strong>Afternoon:</strong> Follow up on pending cases, check Jira deadline filter</li>
              <li>• <strong>End of day:</strong> Update statuses, prepare handover notes for next day</li>
            </ul>
          </div>

          {/* SLA Reference */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⏰ SLA Quick Reference</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Customer Deletion:</span>
                <span className="font-medium">30 days max</span>
              </div>
              <div className="flex justify-between">
                <span>Ad Revocation:</span>
                <span className="font-medium">3 days</span>
              </div>
              <div className="flex justify-between">
                <span>DSAR Request:</span>
                <span className="font-medium">30 days</span>
              </div>
              <div className="flex justify-between">
                <span>Police Inquiry:</span>
                <span className="font-medium text-red-600">Immediate</span>
              </div>
              <div className="flex justify-between">
                <span>Escalation:</span>
                <span className="font-medium">24-48 hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Reference */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">🛠️ Key Tools for Daily Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Processing:</h4>
              <ul className="space-y-1 text-blue-800">
                <li>• MineOS (deletions)</li>
                <li>• OWL (customer data)</li>
                <li>• Jira (tracking)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Communication:</h4>
              <ul className="space-y-1 text-blue-800">
                <li>• PureCloud/Genesys</li>
                <li>• DSAR Google Drive</li>
                <li>• Email templates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Monitoring:</h4>
              <ul className="space-y-1 text-blue-800">
                <li>• Jira Deadline Filter</li>
                <li>• Incident Log</li>
                <li>• POC Directory</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Practice Mode */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-900 mb-2">🎓 Training Exercise</h3>
          <p className="text-green-800 text-sm mb-4">
            Practice prioritizing these queue items based on urgency, SLA, and available information. 
            Consider which tasks you would tackle first during each part of the day.
          </p>
          <p className="text-green-700 text-xs">
            Tip: Police inquiries and escalations always take priority over routine deletions and ad revocations.
          </p>
        </div>
      </div>
    </div>
  );
}