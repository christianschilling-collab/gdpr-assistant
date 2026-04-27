'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getOnboardingStatus, addOnboardingNote } from '@/lib/firebase/onboarding';
import type { OnboardingStatus, SystemAccessStatus } from '@/lib/types/onboarding';
import Link from 'next/link';

export default function OnboardingDashboardPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<{[key: string]: boolean}>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // For viewing other days

  useEffect(() => {
    // We need either a Firebase user email OR a userProfile email for impersonation
    const targetEmail = userProfile?.email || user?.email;
    
    if (!targetEmail) {
      router.push('/');
      return;
    }
    loadOnboardingStatus();
  }, [user, userProfile, router]);

  const loadOnboardingStatus = async () => {
    // Use userProfile email if impersonating, fallback to user email
    const targetEmail = userProfile?.email || user?.email;
    
    if (!targetEmail) return;
    
    try {
      console.log('🔍 Loading onboarding status for:', targetEmail);
      console.log('  - Firebase user:', user?.email);
      console.log('  - Profile user:', userProfile?.email);
      console.log('  - User profile role:', userProfile?.role);
      
      const status = await getOnboardingStatus(targetEmail);
      console.log('📊 Onboarding status found:', status ? 'YES' : 'NO');
      console.log('📊 Status details:', status);
      
      setOnboardingStatus(status);
      
      if (status) {
        // Calculate current day based on start date
        const daysSinceStart = Math.floor(
          (new Date().getTime() - status.startDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        setCurrentDay(Math.min(Math.max(daysSinceStart + 1, 1), 4));
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'requested': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'denied': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted': return '✅';
      case 'pending': return '⏳';
      case 'requested': return '📋';
      case 'denied': return '❌';
      default: return '⚪';
    }
  };

  const getProgressPercentage = () => {
    if (!onboardingStatus) return 0;
    
    // Calculate system access progress
    const totalSystems = onboardingStatus.systemAccess?.length || 0;
    const grantedSystems = onboardingStatus.systemAccess?.filter(s => s.status === 'granted').length || 0;
    const systemProgress = totalSystems > 0 ? (grantedSystems / totalSystems) : 0;
    
    // Calculate task completion progress
    const allTasks = [
      ...getDayTasks(1),
      ...getDayTasks(2), 
      ...getDayTasks(3),
      ...getDayTasks(4)
    ];
    const completedTasksCount = allTasks.filter(task => completedTasks[task.id]).length;
    const taskProgress = allTasks.length > 0 ? (completedTasksCount / allTasks.length) : 0;
    
    // Combined progress (50% system access, 50% tasks)
    const combinedProgress = (systemProgress * 0.4) + (taskProgress * 0.6);
    
    return Math.round(combinedProgress * 100);
  };

  const getSystemAccessProgress = () => {
    if (!onboardingStatus || !onboardingStatus.systemAccess) return 0;
    
    const totalSystems = onboardingStatus.systemAccess.length;
    const grantedSystems = onboardingStatus.systemAccess.filter(s => s.status === 'granted').length;
    
    // Handle edge cases
    if (totalSystems === 0) {
      console.log('⚠️ No systems configured for onboarding');
      return 0;
    }
    
    const progress = Math.round((grantedSystems / totalSystems) * 100);
    console.log(`📊 System Access Progress: ${grantedSystems}/${totalSystems} = ${progress}%`);
    
    return progress;
  };

  const getOverallTaskProgress = () => {
    const allTasks = [
      ...getDayTasks(1),
      ...getDayTasks(2), 
      ...getDayTasks(3),
      ...getDayTasks(4)
    ];
    const completedTasksCount = allTasks.filter(task => completedTasks[task.id]).length;
    return allTasks.length > 0 ? Math.round((completedTasksCount / allTasks.length) * 100) : 0;
  };

  const getDayTasks = (day: number) => {
    const tasks = {
      1: [
        { id: 'sys_access', text: 'System-Zugänge verifizieren (Critical Systems zuerst)', category: 'setup' },
        { id: 'gdpr_hub', text: 'GDPR Team Hub komplett durcharbeiten', category: 'learning' },
        { id: 'classification', text: 'Classification Decision Tree verstehen', category: 'learning' },
        { id: 'daily_checklist', text: 'Daily Queue Processing Checklist lernen', category: 'process' }
      ],
      2: [
        { id: 'core_tools', text: 'Core Tools Training (Jira, MineOS, OWL)', category: 'tools' },
        { id: 'purecloud', text: 'PureCloud/Genesys Queue Management', category: 'tools' },
        { id: 'gmail_workflow', text: 'Gmail GDPR Inbox Workflow', category: 'process' },
        { id: 'live_shadowing', text: 'Live shadowing bei realen Requests', category: 'practice' }
      ],
      3: [
        { id: 'routing_escalation', text: 'Routing & Escalation Workflows', category: 'process' },
        { id: 'poc_directory', text: 'POC Directory & Escalation Criteria', category: 'learning' },
        { id: 'sheets_management', text: 'Google Sheets Management (Stop Email, DP Blacklist)', category: 'tools' },
        { id: 'first_cases', text: 'Erste eigene Cases bearbeiten (supervised)', category: 'practice' }
      ],
      4: [
        { id: 'independent_queue', text: 'Daily Queue Processing selbstständig', category: 'practice' },
        { id: 'customer_calls', text: 'Customer Calls mit PureCloud/Genesys', category: 'practice' },
        { id: 'end_to_end', text: 'End-to-End Case Bearbeitung', category: 'practice' },
        { id: 'assessment', text: 'Manager Assessment & Sign-off', category: 'certification' }
      ]
    };
    return tasks[day as keyof typeof tasks] || [];
  };

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
    
    // Save to localStorage for persistence
    const newState = {
      ...completedTasks,
      [taskId]: !completedTasks[taskId]
    };
    localStorage.setItem(`onboarding_tasks_${userProfile?.email || user?.email}`, JSON.stringify(newState));
  };

  const getDayProgress = (day: number) => {
    const dayTasks = getDayTasks(day);
    const completedCount = dayTasks.filter(task => completedTasks[task.id]).length;
    return dayTasks.length > 0 ? Math.round((completedCount / dayTasks.length) * 100) : 0;
  };

  const canAccessDay = (day: number) => {
    // Day 1 always accessible
    if (day === 1) return true;
    
    // Other days accessible if previous day is at least 80% complete
    const prevDayProgress = getDayProgress(day - 1);
    return prevDayProgress >= 80;
  };

  const getDisplayDay = () => {
    return selectedDay || currentDay;
  };

  // Load completed tasks from localStorage
  useEffect(() => {
    const targetEmail = userProfile?.email || user?.email;
    if (targetEmail) {
      const saved = localStorage.getItem(`onboarding_tasks_${targetEmail}`);
      if (saved) {
        try {
          setCompletedTasks(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading saved tasks:', e);
        }
      }
    }
  }, [user?.email, userProfile?.email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading your onboarding status...</div>
      </div>
    );
  }

  // No onboarding started yet
  if (!onboardingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎓</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to GDPR Team Training!</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Your training process hasn't started yet. Please contact your manager to begin your 
              4-day GDPR team training program.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold text-blue-900 mb-2">What to expect:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <div className="font-medium text-blue-900">📚 Day 1: Fundamentals</div>
                  <div className="text-sm text-blue-800">GDPR Hub, Classification, System Setup</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">🛠️ Day 2: Tools Training</div>
                  <div className="text-sm text-blue-800">Jira, MineOS, OWL, PureCloud</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">🎯 Day 3: Advanced Workflows</div>
                  <div className="text-sm text-blue-800">Escalation, Routing, Documentation</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">🚀 Day 4: Independent Practice</div>
                  <div className="text-sm text-blue-800">Hands-on, Assessment, Certification</div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Manager: Please use the <Link href="/admin/onboarding/access-tracker" className="text-blue-600 hover:underline">
                System Access Tracker
              </Link> to start this user's onboarding.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My GDPR Training</h1>
              <p className="text-gray-600 mt-1">
                Day {currentDay} of 4 • Started {onboardingStatus.startDate.toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Overall Progress</div>
              <div className="text-2xl font-bold text-blue-600">{getProgressPercentage()}%</div>
              <div className="text-xs text-gray-500 mt-1">
                Tasks: {getOverallTaskProgress()}% • Systems: {getSystemAccessProgress()}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((day) => {
            const progress = getDayProgress(day);
            const canAccess = canAccessDay(day);
            const isCurrentDay = day === currentDay;
            const isSelectedDay = day === getDisplayDay();
            
            return (
              <button
                key={day}
                onClick={() => canAccess ? setSelectedDay(day === currentDay ? null : day) : null}
                disabled={!canAccess}
                className={`bg-white rounded-lg p-6 border-2 transition-all ${
                  !canAccess ? 'border-gray-200 opacity-50 cursor-not-allowed' :
                  isSelectedDay ? 'border-blue-500 bg-blue-50 shadow-lg' :
                  isCurrentDay ? 'border-blue-300 bg-blue-50' :
                  progress === 100 ? 'border-green-300 bg-green-50 hover:bg-green-100' :
                  'border-gray-200 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    !canAccess ? 'text-gray-400' :
                    isSelectedDay ? 'text-blue-600' :
                    isCurrentDay ? 'text-blue-600' :
                    progress === 100 ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    Day {day}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {day === 1 ? 'Fundamentals' :
                     day === 2 ? 'Tools Training' :
                     day === 3 ? 'Advanced Workflows' :
                     'Independent Practice'}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        progress === 100 ? 'bg-green-500' :
                        progress > 0 ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`}
                      style={{width: `${progress}%`}}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{progress}% complete</div>
                  
                  {isCurrentDay && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      CURRENT DAY
                    </div>
                  )}
                  {isSelectedDay && !isCurrentDay && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      VIEWING
                    </div>
                  )}
                  {progress === 100 && !isCurrentDay && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ COMPLETED
                    </div>
                  )}
                  {!canAccess && (
                    <div className="mt-2 text-xs text-gray-400">
                      🔒 LOCKED
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Access Status */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">System Access Status</h2>
                  <p className="text-sm text-gray-600 mt-1">Your access to GDPR tools and systems</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{getSystemAccessProgress()}%</div>
                  <div className="text-xs text-gray-500">Systems Granted</div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {onboardingStatus.systemAccess && onboardingStatus.systemAccess.length > 0 ? (
                <div className="space-y-3">
                  {onboardingStatus.systemAccess.map((access, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getSystemStatusColor(access.status)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getStatusIcon(access.status)}</span>
                        <div>
                          <div className="font-medium text-sm">{access.system}</div>
                          {access.notes && (
                            <div className="text-xs text-gray-600">{access.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-medium uppercase">
                        {access.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No system access requests yet
                </div>
              )}
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Day {getDisplayDay()} Tasks</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {getDisplayDay() === currentDay ? 'Your current learning objectives' : 'Review previous day tasks'}
                  </p>
                </div>
                {selectedDay && selectedDay !== currentDay && (
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    ← Back to Current Day
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {getDayTasks(getDisplayDay()).map((task, index) => (
                  <div key={task.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={completedTasks[task.id] || false}
                      onChange={() => toggleTaskCompletion(task.id)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className={`text-sm ${completedTasks[task.id] ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.text}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          task.category === 'setup' ? 'bg-purple-100 text-purple-800' :
                          task.category === 'learning' ? 'bg-blue-100 text-blue-800' :
                          task.category === 'tools' ? 'bg-green-100 text-green-800' :
                          task.category === 'process' ? 'bg-yellow-100 text-yellow-800' :
                          task.category === 'practice' ? 'bg-orange-100 text-orange-800' :
                          task.category === 'certification' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.category}
                        </span>
                        {completedTasks[task.id] && (
                          <span className="text-xs text-green-600 font-medium">✓ Complete</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Day Progress Summary */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-900">Day {getDisplayDay()} Progress</div>
                    <div className="text-sm text-blue-800">
                      {getDayTasks(getDisplayDay()).filter(task => completedTasks[task.id]).length} of {getDayTasks(getDisplayDay()).length} tasks completed
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {getDayProgress(getDisplayDay())}%
                  </div>
                </div>
                
                {getDayProgress(getDisplayDay()) >= 80 && getDisplayDay() < 4 && (
                  <div className="mt-3 text-sm text-green-700 bg-green-100 p-2 rounded">
                    🎉 Great progress! You can now access Day {getDisplayDay() + 1} training.
                  </div>
                )}
                
                {getDayProgress(getDisplayDay()) === 100 && (
                  <div className="mt-3 text-sm text-green-700 bg-green-100 p-2 rounded">
                    ✅ Day {getDisplayDay()} completed! Excellent work!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Training Tools */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Training Tools</h2>
            <p className="text-sm text-gray-600 mt-1">Interactive learning resources</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/training/classification-tree"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <div className="text-2xl mb-2">🌳</div>
                <h3 className="font-medium text-gray-900">Classification Tree</h3>
                <p className="text-sm text-gray-600">Practice request classification</p>
              </Link>
              <Link
                href="/training/queue-dashboard"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-medium text-gray-900">Queue Dashboard</h3>
                <p className="text-sm text-gray-600">Learn daily workflows</p>
              </Link>
              <Link
                href="/training/escalation-assistant"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <div className="text-2xl mb-2">🆘</div>
                <h3 className="font-medium text-gray-900">Escalation Assistant</h3>
                <p className="text-sm text-gray-600">Know who to contact</p>
              </Link>
              <Link
                href="/training/certification"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <div className="text-2xl mb-2">🎓</div>
                <h3 className="font-medium text-gray-900">Knowledge Tests</h3>
                <p className="text-sm text-gray-600">Test your progress</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Confluence Resources */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📚</span>
            <div>
              <h3 className="text-lg font-bold text-blue-900">GDPR Team Hub</h3>
              <p className="text-blue-800 text-sm">Your source of truth for all GDPR workflows</p>
            </div>
          </div>
          <div className="flex gap-4">
            <a
              href="https://hellofresh.atlassian.net/wiki/spaces/CCDACH/pages/4692772632/GDPR+Team+Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Open GDPR Team Hub
            </a>
            <a
              href="https://hellofresh.atlassian.net/wiki/spaces/CCDACH/pages/6471843874/GDPR+Team+-+System+Access+Onboarding"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm"
            >
              Onboarding Guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}