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
} from '@/lib/firebase/incidents';
import { Incident, IncidentTask, IncidentAuditLog, IncidentStatus } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  ShieldExclamationIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserIcon,
  CalendarIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  generateIncidentPDF,
  generateIncidentCSV,
  downloadCSV,
} from '@/lib/utils/exportIncident';

const STATUS_FLOW: IncidentStatus[] = [
  'Reporting',
  'Investigation',
  'Containment',
  'Resolution',
  'Post-Incident Review',
  'Closed',
];

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const incidentId = params.id as string;
  
  // Get user email for audit trail, fallback to 'system'
  const userEmail = user?.email || 'system';

  const [incident, setIncident] = useState<Incident | null>(null);
  const [tasks, setTasks] = useState<IncidentTask[]>([]);
  const [auditLog, setAuditLog] = useState<IncidentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
  const [targetStatus, setTargetStatus] = useState<IncidentStatus | null>(null);
  
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

  useEffect(() => {
    console.log('🎯 useEffect triggered, incidentId:', incidentId);
    loadIncidentData();
  }, [incidentId]);

  async function loadIncidentData() {
    console.log('🔍 Loading incident:', incidentId);
    try {
      // Retry logic for Firestore propagation delay
      let incidentData: Incident | null = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (!incidentData && retries < maxRetries) {
        console.log(`📡 Attempt ${retries + 1}/${maxRetries} to fetch incident`);
        incidentData = await getIncident(incidentId);
        if (!incidentData && retries < maxRetries - 1) {
          console.log('⏳ Incident not found yet, retrying in 500ms...');
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        } else {
          break;
        }
      }

      if (!incidentData) {
        console.error('❌ Incident not found after', maxRetries, 'attempts');
        addToast('Incident not found', 'error');
        // Don't redirect - let user see the error state
        return;
      }

      console.log('✅ Incident loaded:', incidentData.incidentId);
      
      const [tasksData, auditData] = await Promise.all([
        getIncidentTasks(incidentId),
        getIncidentAuditLog(incidentId),
      ]);

      setIncident(incidentData);
      setTasks(tasksData);
      setAuditLog(auditData);
      
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

    // Check if there are pending tasks and show info toast (no blocking popup)
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
      await loadIncidentData(); // Reload to get new tasks and audit trail
    } catch (error) {
      console.error('Error updating status:', error);
      addToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  }

  function handleStatusButtonClick(newStatus: IncidentStatus) {
    setTargetStatus(newStatus);
    setShowStatusConfirmDialog(true);
  }

  function getTimeElapsedSinceDiscovery(): { hours: number; days: number; displayText: string } {
    if (!incident) return { hours: 0, days: 0, displayText: '' };
    
    const now = new Date();
    const discovery = incident.discoveryDate;
    const hoursElapsed = Math.floor((now.getTime() - discovery.getTime()) / (1000 * 60 * 60));
    const daysElapsed = Math.floor(hoursElapsed / 24);
    
    if (daysElapsed > 0) {
      const remainingHours = hoursElapsed % 24;
      return {
        hours: hoursElapsed,
        days: daysElapsed,
        displayText: `${daysElapsed} day${daysElapsed > 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
      };
    } else {
      return {
        hours: hoursElapsed,
        days: 0,
        displayText: `${hoursElapsed} hour${hoursElapsed !== 1 ? 's' : ''}`
      };
    }
  }
  
  async function handleCompleteTask(taskId: string) {
    try {
      await completeIncidentTask(taskId, userEmail);
      addToast('Task completed!', 'success');
      await loadIncidentData(); // Reload
    } catch (error) {
      console.error('Error completing task:', error);
      addToast('Failed to complete task', 'error');
    }
  }
  
  async function handleReopenTask(taskId: string) {
    try {
      await reopenIncidentTask(taskId, userEmail);
      addToast('Task reopened', 'info');
      await loadIncidentData(); // Reload
    } catch (error) {
      console.error('Error reopening task:', error);
      addToast('Failed to reopen task', 'error');
    }
  }
  
  async function handleSaveField(fieldName: string, value: string) {
    if (!incident) return;
    
    console.log('💾 Saving field:', fieldName, 'Value length:', value.length);
    
    setUpdating(true);
    try {
      await updateIncidentField(incident.id, fieldName, value, userEmail);
      
      // Update local incident state immediately (optimistic update)
      setIncident({
        ...incident,
        [fieldName]: value,
      });
      
      // Friendly field names for toast
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
      console.log('✅ Field saved successfully:', fieldName);
      addToast(`${displayName} updated successfully`, 'success');
      setEditingField(null);
      
      // Wait for Firestore propagation before reloading (to refresh audit log and tasks)
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadIncidentData();
    } catch (error) {
      console.error('❌ Error updating field:', error);
      addToast('Failed to update field', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleExportPDF() {
    if (!incident) return;
    
    try {
      console.log('🔍 Starting PDF export for:', incident.incidentId);
      console.log('📊 Data:', { 
        incident: incident.incidentId, 
        tasksCount: tasks.length, 
        auditLogCount: auditLog.length 
      });
      
      await generateIncidentPDF(incident, tasks, auditLog);
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      console.error('❌ PDF Export Error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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

  const currentStatusIndex = STATUS_FLOW.indexOf(incident.status);
  const totalImpacted = incident.countryImpact.reduce((sum, c) => sum + c.impactedVolume, 0);
  const daysSinceDiscovery = Math.floor(
    (Date.now() - incident.discoveryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate open tasks (live - updates when tasks change)
  const openTasksCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <ErrorBoundary componentName="IncidentDetailPage">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/incidents')}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
            >
              ← Back to Incidents
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Incident {incident.incidentId}
                </h1>
                <p className="text-gray-600 mt-1">{incident.natureOfIncident}</p>
              </div>
              <div className="flex gap-3">
                {/* Export Buttons */}
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
                  title="Export as PDF (HelloFresh 2026 Design)"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  Export PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold flex items-center gap-2"
                  title="Export as CSV (Technical Backup)"
                >
                  <DocumentChartBarIcon className="w-5 h-5" />
                  Export CSV
                </button>
                
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  incident.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                  incident.status === 'Resolution' || incident.status === 'Post-Incident Review' ? 'bg-blue-100 text-blue-800' :
                  incident.status === 'Containment' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {incident.status}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Risk Level</div>
              <div className={`text-2xl font-bold mt-1 ${
                incident.riskAssessment === 'High' ? 'text-red-600' :
                incident.riskAssessment === 'Medium' ? 'text-yellow-600' :
                incident.riskAssessment === 'Low' ? 'text-green-600' :
                incident.riskAssessment === 'Critical' ? 'text-red-600' :
                'text-gray-400'
              }`}>
                {incident.riskAssessment || 'Not assessed'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Breach Type</div>
              <div className="text-lg font-bold mt-1 text-gray-900">
                {incident.breachTypes && incident.breachTypes.length > 0
                  ? incident.breachTypes.map(type => type.replace('Loss of ', '')).join(', ')
                  : incident.primaryLegalRisk?.replace('Loss of ', '') || 'Unknown'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Impacted Customers</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {totalImpacted.toLocaleString()}
              </div>
            </div>
            <div className={`bg-white rounded-lg shadow-sm border-2 p-4 ${
              openTasksCount > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
            }`}>
              <div className="text-sm text-gray-600">Open Tasks</div>
              <div className={`text-2xl font-bold mt-1 ${
                openTasksCount > 0 ? 'text-orange-600' : 'text-gray-900'
              }`}>
                {openTasksCount}
              </div>
              {openTasksCount > 0 && (
                <div className="text-xs text-orange-600 mt-1">
                  Action required
                </div>
              )}
            </div>
          </div>

          {/* Status Workflow */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Progress</h2>
            <div className="flex items-center gap-2 mb-6">
              {STATUS_FLOW.map((status, index) => (
                <div key={status} className="flex items-center flex-1">
                  <div className={`flex-1 h-2 rounded ${
                    index <= currentStatusIndex ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                  {index < STATUS_FLOW.length - 1 && (
                    <div className={`w-8 h-2 ${
                      index < currentStatusIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              {STATUS_FLOW.map((status) => (
                <div key={status} className="text-center flex-1">
                  {status}
                </div>
              ))}
            </div>

            {/* Status Actions */}
            {incident.status !== 'Closed' && (
              <div className="mt-6 flex gap-3">
                {currentStatusIndex < STATUS_FLOW.length - 1 && (
                  <button
                    onClick={() => handleStatusButtonClick(STATUS_FLOW[currentStatusIndex + 1])}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                  >
                    Move to {STATUS_FLOW[currentStatusIndex + 1]}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Nature of Incident</div>
                    <div className="text-gray-900">{incident.natureOfIncident}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Affected Systems</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {incident.affectedSystems.map(sys => (
                        <span key={sys} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {sys}
                        </span>
                      ))}
                    </div>
                  </div>
                  {incident.dataCategories && incident.dataCategories.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">Data Categories Affected</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {incident.dataCategories.map(cat => (
                          <span key={cat} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-700">Discovery Date</div>
                    <div className="text-gray-900">{incident.discoveryDate.toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Impact Period</div>
                    <div className="text-gray-900">
                      {incident.impactPeriod.start.toLocaleDateString()}
                      {incident.impactPeriod.end && ` - ${incident.impactPeriod.end.toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Investigation Fields (unlocked during Investigation phase) */}
              {(incident.status === 'Investigation' || 
                incident.status === 'Containment' || 
                incident.status === 'Resolution' ||
                incident.status === 'Post-Incident Review' ||
                incident.status === 'Closed') && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MagnifyingGlassIcon className="w-6 h-6 text-blue-600" />
                    Investigation Details
                  </h2>
                  
                  {/* Root Cause */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Root Cause</div>
                      {editingField !== 'rootCause' && (
                        <button
                          onClick={() => setEditingField('rootCause')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingField === 'rootCause' ? (
                      <div>
                        <textarea
                          value={rootCause}
                          onChange={(e) => setRootCause(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                          placeholder="Describe the root cause..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveField('rootCause', rootCause)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null);
                              setRootCause(incident.rootCause || '');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {incident.rootCause || <span className="text-gray-400 italic">Not documented yet</span>}
                      </div>
                    )}
                  </div>

                  {/* Technical Resolution */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Technical Resolution</div>
                      {editingField !== 'technicalResolution' && (
                        <button
                          onClick={() => setEditingField('technicalResolution')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingField === 'technicalResolution' ? (
                      <div>
                        <textarea
                          value={technicalResolution}
                          onChange={(e) => setTechnicalResolution(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                          placeholder="Describe the technical resolution..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveField('technicalResolution', technicalResolution)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null);
                              setTechnicalResolution(incident.technicalResolution || '');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {incident.technicalResolution || <span className="text-gray-400 italic">Not documented yet</span>}
                      </div>
                    )}
                  </div>

                  {/* Risk Assessment */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Risk Assessment</div>
                      {editingField !== 'riskAssessment' && (
                        <button
                          onClick={() => setEditingField('riskAssessment')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingField === 'riskAssessment' ? (
                      <div>
                        <select
                          value={riskAssessment}
                          onChange={(e) => setRiskAssessment(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Select risk level...</option>
                          <option value="Low">Low - Minimal impact</option>
                          <option value="Medium">Medium - Moderate impact</option>
                          <option value="High">High - Significant impact</option>
                          <option value="Critical">Critical - Severe impact</option>
                        </select>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveField('riskAssessment', riskAssessment)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null);
                              setRiskAssessment(incident.riskAssessment || '');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {incident.riskAssessment ? (
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            incident.riskAssessment === 'Critical' ? 'bg-red-100 text-red-800' :
                            incident.riskAssessment === 'High' ? 'bg-orange-100 text-orange-800' :
                            incident.riskAssessment === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {incident.riskAssessment}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not assessed yet</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Containment Measures (unlocked during Containment phase) */}
              {(incident.status === 'Containment' || 
                incident.status === 'Resolution' ||
                incident.status === 'Post-Incident Review' ||
                incident.status === 'Closed') && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                    Containment
                  </h2>
                  
                  {/* Containment Measures */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Containment Measures *</div>
                      {editingField !== 'containmentMeasures' && (
                        <button
                          onClick={() => setEditingField('containmentMeasures')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingField === 'containmentMeasures' ? (
                      <div>
                        <textarea
                          value={containmentMeasures}
                          onChange={(e) => setContainmentMeasures(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                          placeholder="Describe what actions were taken to stop the breach..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveField('containmentMeasures', containmentMeasures)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null);
                              setContainmentMeasures(incident.containmentMeasures || '');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {incident.containmentMeasures || <span className="text-gray-400 italic">Required - Not documented yet</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resolution (unlocked during Resolution phase) */}
              {(incident.status === 'Resolution' ||
                incident.status === 'Post-Incident Review' ||
                incident.status === 'Closed') && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckBadgeIcon className="w-6 h-6 text-green-600" />
                    Resolution
                  </h2>
                  
                  {/* Resolution Description */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Resolution Description *</div>
                      {editingField !== 'resolutionDescription' && (
                        <button
                          onClick={() => setEditingField('resolutionDescription')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingField === 'resolutionDescription' ? (
                      <div>
                        <textarea
                          value={resolutionDescription}
                          onChange={(e) => setResolutionDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                          placeholder="Describe the final resolution and fix..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveField('resolutionDescription', resolutionDescription)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null);
                              setResolutionDescription(incident.resolutionDescription || '');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {incident.resolutionDescription || <span className="text-gray-400 italic">Required - Not documented yet</span>}
                      </div>
                    )}
                  </div>

                  {/* Preventive Measures */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Preventive Measures *</div>
                      {editingField !== 'preventiveMeasures' && (
                        <button
                          onClick={() => setEditingField('preventiveMeasures')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingField === 'preventiveMeasures' ? (
                      <div>
                        <textarea
                          value={preventiveMeasures}
                          onChange={(e) => setPreventiveMeasures(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                          placeholder="Describe measures taken to prevent recurrence..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveField('preventiveMeasures', preventiveMeasures)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingField(null);
                              setPreventiveMeasures(incident.preventiveMeasures || '');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {incident.preventiveMeasures || <span className="text-gray-400 italic">Required - Not documented yet</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Country Impact */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Country Impact</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Country</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Volume</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Complaints</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incident.countryImpact
                        .filter(c => c.impactedVolume > 0 || c.complaintsReceived > 0)
                        .map(country => (
                        <tr key={country.country} className="border-t border-gray-200">
                          <td className="px-4 py-2 font-medium">{country.country}</td>
                          <td className="px-4 py-2">{country.impactedVolume.toLocaleString()}</td>
                          <td className="px-4 py-2">{country.complaintsReceived}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              country.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                              country.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {country.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Tasks */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Action Plan</h2>
                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No tasks yet</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          task.status === 'completed' 
                            ? 'bg-gray-50 border-gray-200' 
                            : task.priority === 'High' 
                              ? 'bg-red-50 border-red-300 shadow-sm animate-pulse' 
                              : 'bg-white border-yellow-300 shadow-sm'
                        }`}
                      >
                        {/* View Mode - No editing allowed */}
                        <div>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className={`font-medium ${
                                  task.status === 'completed' ? 'text-gray-600 line-through' : 'text-gray-900'
                                }`}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                  <span className={`px-2 py-1 rounded ${
                                    task.priority === 'High' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {task.priority}
                                  </span>
                                  {task.dueDate && (
                                    <span>Due: {task.dueDate.toLocaleDateString()}</span>
                                  )}
                                  <span className="text-gray-500 flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" />
                                    {task.owner.split('@')[0]}
                                  </span>
                                </div>
                                
                                {/* External Links */}
                                {task.externalLinks && task.externalLinks.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {task.externalLinks.map((link, index) => (
                                      <a
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                                      >
                                        <LinkIcon className="w-3 h-3" />
                                        {link.label}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="ml-3 flex items-center gap-2">
                                {task.status === 'completed' ? (
                                  <button
                                    onClick={() => handleReopenTask(task.id)}
                                    className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-700 transition-colors"
                                    title="Click to reopen task"
                                  >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleCompleteTask(task.id)}
                                    className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors"
                                    title="Mark as complete"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Log */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Audit Trail</h2>
                {auditLog.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No audit entries yet</p>
                ) : (
                  <div className="space-y-3">
                    {auditLog.slice(0, 10).map(entry => (
                      <div key={entry.id} className="border-l-2 border-gray-300 pl-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{entry.action}</div>
                        {entry.fieldChanged && (
                          <div className="text-xs text-gray-600 mt-1">
                            {entry.fieldChanged}: {entry.oldValue} → {entry.newValue}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.timestamp.toLocaleString()} by {entry.userEmail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Change Confirmation Dialog */}
        {showStatusConfirmDialog && targetStatus && incident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Confirm Workflow Stage Transition
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  You are about to move this incident from <span className="font-semibold text-gray-900">{incident.status}</span> to <span className="font-semibold text-blue-700">{targetStatus}</span>.
                </p>
                
                {/* Special warning for Reporting → Investigation */}
                {incident.status === 'Reporting' && targetStatus === 'Investigation' && (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-3">
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-orange-900 mb-2">
                          ⚠️ Important: 72-Hour Notification Window
                        </p>
                        <p className="text-orange-800">
                          The 72-hour notification window under <strong>Art. 33 GDPR</strong> starts from the moment the breach was discovered.
                        </p>
                        <div className="mt-2 space-y-1 text-orange-900">
                          <p><strong>Discovery Date:</strong> {incident.discoveryDate.toLocaleDateString()} at {incident.discoveryDate.toLocaleTimeString()}</p>
                          <p><strong>Time Elapsed:</strong> {getTimeElapsedSinceDiscovery().displayText}</p>
                          <p className="mt-2 text-xs">
                            If DPA notification may be required, ensure this is tracked and completed within the regulatory deadline.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStatusConfirmDialog(false);
                    setTargetStatus(null);
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusChange(targetStatus)}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
                >
                  {updating ? 'Updating...' : `Confirm: Move to ${targetStatus}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
