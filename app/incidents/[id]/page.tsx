'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getIncident,
  updateIncidentStatus,
  updateIncidentField,
  getIncidentTasks,
  getIncidentAuditLog,
  completeIncidentTask,
  reopenIncidentTask,
  calculateNotificationDeadline,
} from '@/lib/firebase/incidents';
import { getAllTaskForceMembers } from '@/lib/firebase/taskForce';
import { Incident, IncidentTask, IncidentAuditLog, IncidentStatus, TaskForceMember } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  generateIncidentPDF,
  generateIncidentCSV,
  downloadCSV,
} from '@/lib/utils/exportIncident';
import { WorkflowStepper } from '@/components/incidents/WorkflowStepper';
import { ActionSidebar } from '@/components/incidents/ActionSidebar';
import { WorkflowContentArea } from '@/components/incidents/WorkflowContentArea';
import { TaskForceCoordinationSection } from '@/components/incidents/TaskForceCoordinationSection';
import { formatIncidentScenarioLabelsEn, scenarioTagLabelEn } from '@/lib/constants/incidentScenarioTags';
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const incidentId = params.id as string;
  
  const userEmail = user?.email || 'system';

  const [incident, setIncident] = useState<Incident | null>(null);
  const [tasks, setTasks] = useState<IncidentTask[]>([]);
  const [auditLog, setAuditLog] = useState<IncidentAuditLog[]>([]);
  const [taskForceMembers, setTaskForceMembers] = useState<TaskForceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
  const [targetStatus, setTargetStatus] = useState<IncidentStatus | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [rootCause, setRootCause] = useState('');
  const [technicalResolution, setTechnicalResolution] = useState('');
  const [riskAssessment, setRiskAssessment] = useState('');
  const [containmentMeasures, setContainmentMeasures] = useState('');
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [workaroundCS, setWorkaroundCS] = useState('');
  const [legalReasoning, setLegalReasoning] = useState('');

  const [showTaskForceModal, setShowTaskForceModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    loadIncidentData();
  }, [incidentId]);

  async function loadIncidentData() {
    try {
      setLoading(true);
      
      // Load incident with retries
      let incidentData: Incident | null = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (!incidentData && retries < maxRetries) {
        incidentData = await getIncident(incidentId);
        if (!incidentData && retries < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        } else {
          break;
        }
      }

      if (!incidentData) {
        addToast('Incident not found', 'error');
        return;
      }

      // Load all related data
      const [tasksData, auditData, taskForceMembersData] = await Promise.all([
        getIncidentTasks(incidentId),
        getIncidentAuditLog(incidentId),
        getAllTaskForceMembers()
      ]);

      setIncident(incidentData);
      setTasks(tasksData);
      setAuditLog(auditData);
      setTaskForceMembers(taskForceMembersData);
      
      // Initialize editable fields
      setRootCause(incidentData.rootCause || '');
      setTechnicalResolution(incidentData.technicalResolution || '');
      setRiskAssessment(incidentData.riskAssessment || '');
      setContainmentMeasures(incidentData.containmentMeasures || '');
      setResolutionDescription(incidentData.resolutionDescription || '');
      setPreventiveMeasures(incidentData.preventiveMeasures || '');
      setWorkaroundCS(incidentData.workaroundCS || '');
      setLegalReasoning(incidentData.legalReasoning || '');
    } catch (error) {
      console.error('Error loading incident:', error);
      addToast('Failed to load incident data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: IncidentStatus) {
    if (!incident) return;

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length > 0) {
      addToast(
        `⚠️ Note: ${pendingTasks.length} task(s) still pending. Consider completing them before moving forward.`,
        'info'
      );
    }

    setUpdating(true);
    try {
      await updateIncidentStatus(incident.id, newStatus, userEmail);
      addToast(`Status updated to: ${newStatus}`, 'success');
      setShowStatusConfirmDialog(false);
      setTargetStatus(null);
      await loadIncidentData();
    } catch (error) {
      console.error('Error updating status:', error);
      addToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    try {
      await completeIncidentTask(taskId, userEmail);
      addToast('Task completed!', 'success');
      await loadIncidentData();
    } catch (error) {
      console.error('Error completing task:', error);
      addToast('Failed to complete task', 'error');
    }
  }
  
  async function handleReopenTask(taskId: string) {
    try {
      await reopenIncidentTask(taskId, userEmail);
      addToast('Task reopened', 'info');
      await loadIncidentData();
    } catch (error) {
      console.error('Error reopening task:', error);
      addToast('Failed to reopen task', 'error');
    }
  }
  
  async function handleSaveField(fieldName: string, value: string) {
    if (!incident) return;
    
    setUpdating(true);
    try {
      await updateIncidentField(incident.id, fieldName as keyof Incident, value as never, userEmail);
      
      setIncident({
        ...incident,
        [fieldName]: value,
      });
      
      const fieldDisplayNames: Record<string, string> = {
        rootCause: 'Root Cause',
        technicalResolution: 'Technical Resolution',
        riskAssessment: 'Risk Assessment',
        containmentMeasures: 'Containment Measures',
        resolutionDescription: 'Resolution Description',
        preventiveMeasures: 'Preventive Measures',
        workaroundCS: 'CS Workaround',
        legalReasoning: 'Legal Reasoning',
      };
      
      const displayName = fieldDisplayNames[fieldName] || fieldName;
      addToast(`${displayName} updated successfully`, 'success');
      setEditingField(null);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadIncidentData();
    } catch (error) {
      console.error('Error updating field:', error);
      addToast('Failed to update field', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleExportPDF() {
    if (!incident) return;
    
    try {
      await generateIncidentPDF(incident, tasks, auditLog);
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      console.error('PDF Export Error:', error);
      addToast(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  function handleExportCSV() {
    if (!incident) return;
    
    try {
      const csv = generateIncidentCSV(incident, tasks, auditLog);
      const filename = `${incident.incidentId}_Backup_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);
      addToast('CSV exported successfully', 'success');
    } catch (error) {
      console.error('Error generating CSV:', error);
      addToast('Failed to generate CSV', 'error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading incident {incidentId}...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Incident not found</p>
          <p className="text-gray-500 text-sm mt-2">ID: {incidentId}</p>
          <button
            onClick={() => router.push('/incidents')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  const totalImpacted = incident.countryImpact.reduce(
    (sum, c) => sum + (c.impactedVolume ?? 0),
    0
  );

  const art33Deadline = incident.notificationDeadline ?? calculateNotificationDeadline(incident.discoveryDate);
  const hoursRemaining = Math.floor((art33Deadline.getTime() - Date.now()) / (1000 * 60 * 60));
  const art33Overdue = hoursRemaining < 0 && !incident.authorityNotifiedAt;

  return (
    <ErrorBoundary componentName="IncidentDetailPage">
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/incidents')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="text-center">
              <div className="font-semibold text-gray-900">{incident.incidentId}</div>
              <div className="text-sm text-gray-500">{incident.status}</div>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Header */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/incidents')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Back to Incidents</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">{incident.incidentId}</h1>
              <div className="flex items-center justify-center gap-3 mt-2">
                {incident.scenarioTags && incident.scenarioTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {incident.scenarioTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950"
                      >
                        {scenarioTagLabelEn(tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {art33Overdue && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Art. 33 Overdue
                </div>
              )}
              <div className="text-right text-sm text-gray-600">
                <div className="font-medium">{totalImpacted.toLocaleString()} impacted</div>
                <div>Opened by {incident.createdBy.split('@')[0]}</div>
              </div>
            </div>
          </div>

          {/* Workflow Stepper */}
          <div className="mb-8">
            <WorkflowStepper
              currentStatus={incident.status}
              onStatusChange={handleStatusChange}
              disabled={updating}
            />
          </div>

          {/* Main Layout: Content + Sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="xl:col-span-3">
              <WorkflowContentArea
                incident={incident}
                userEmail={userEmail}
                onUpdated={loadIncidentData}
                editingField={editingField}
                setEditingField={setEditingField}
                rootCause={rootCause}
                setRootCause={setRootCause}
                technicalResolution={technicalResolution}
                setTechnicalResolution={setTechnicalResolution}
                riskAssessment={riskAssessment}
                setRiskAssessment={setRiskAssessment}
                containmentMeasures={containmentMeasures}
                setContainmentMeasures={setContainmentMeasures}
                resolutionDescription={resolutionDescription}
                setResolutionDescription={setResolutionDescription}
                preventiveMeasures={preventiveMeasures}
                setPreventiveMeasures={setPreventiveMeasures}
                workaroundCS={workaroundCS}
                setWorkaroundCS={setWorkaroundCS}
                legalReasoning={legalReasoning}
                setLegalReasoning={setLegalReasoning}
                onSaveField={handleSaveField}
                updating={updating}
              />
            </div>

            {/* Action Sidebar - Desktop */}
            <div className="hidden xl:block">
              <ActionSidebar
                incident={incident}
                tasks={tasks}
                auditLog={auditLog}
                taskForceMembers={taskForceMembers}
                onCompleteTask={handleCompleteTask}
                onReopenTask={handleReopenTask}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onOpenTaskForceModal={() => setShowTaskForceModal(true)}
                onOpenUpdateModal={() => setShowUpdateModal(true)}
              />
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto h-full pb-20">
                <ActionSidebar
                  incident={incident}
                  tasks={tasks}
                  auditLog={auditLog}
                  taskForceMembers={taskForceMembers}
                  onCompleteTask={handleCompleteTask}
                  onReopenTask={handleReopenTask}
                  onExportPDF={handleExportPDF}
                  onExportCSV={handleExportCSV}
                  onOpenTaskForceModal={() => {
                    setShowTaskForceModal(true);
                    setSidebarOpen(false);
                  }}
                  onOpenUpdateModal={() => {
                    setShowUpdateModal(true);
                    setSidebarOpen(false);
                  }}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Task-Force Modal */}
        {showTaskForceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Task-Force Coordination</h2>
                  <button
                    onClick={() => setShowTaskForceModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <TaskForceCoordinationSection
                  incident={incident}
                  userEmail={userEmail}
                  onUpdated={loadIncidentData}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}