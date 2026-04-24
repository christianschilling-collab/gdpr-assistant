'use client';

import { useState } from 'react';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Incident, IncidentStatus } from '@/lib/types';
import { ImpactAnalysisSection } from './ImpactAnalysisSection';
import { TaskForceCoordinationSection } from './TaskForceCoordinationSection';
import { formatIncidentScenarioLabelsEn, scenarioTagLabelEn } from '@/lib/constants/incidentScenarioTags';

interface WorkflowContentAreaProps {
  incident: Incident;
  userEmail: string;
  onUpdated: () => Promise<void>;
  
  // Editable fields
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  
  // Field values
  rootCause: string;
  setRootCause: (value: string) => void;
  technicalResolution: string;
  setTechnicalResolution: (value: string) => void;
  riskAssessment: string;
  setRiskAssessment: (value: string) => void;
  containmentMeasures: string;
  setContainmentMeasures: (value: string) => void;
  resolutionDescription: string;
  setResolutionDescription: (value: string) => void;
  preventiveMeasures: string;
  setPreventiveMeasures: (value: string) => void;
  workaroundCS: string;
  setWorkaroundCS: (value: string) => void;
  legalReasoning: string;
  setLegalReasoning: (value: string) => void;
  
  // Actions
  onSaveField: (fieldName: string, value: string) => Promise<void>;
  updating: boolean;
}

export function WorkflowContentArea({
  incident,
  userEmail,
  onUpdated,
  editingField,
  setEditingField,
  rootCause,
  setRootCause,
  technicalResolution,
  setTechnicalResolution,
  riskAssessment,
  setRiskAssessment,
  containmentMeasures,
  setContainmentMeasures,
  resolutionDescription,
  setResolutionDescription,
  preventiveMeasures,
  setPreventiveMeasures,
  workaroundCS,
  setWorkaroundCS,
  legalReasoning,
  setLegalReasoning,
  onSaveField,
  updating
}: WorkflowContentAreaProps) {
  
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    impact: true,
    taskforce: true,
    investigation: false,
    containment: false,
    resolution: false
  });

  const [viewMode, setViewMode] = useState<'focused' | 'complete'>('focused');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Determine what content is relevant for current status
  const isRelevantForStatus = (content: string) => {
    const relevanceMap: Record<IncidentStatus, string[]> = {
      'Reporting': ['summary', 'impact', 'taskforce'],
      'Investigation': ['summary', 'investigation', 'taskforce', 'impact'],
      'Containment': ['containment', 'taskforce', 'investigation', 'summary'],
      'Resolution': ['resolution', 'containment', 'taskforce', 'investigation'],
      'Post-Incident Review': ['resolution', 'investigation', 'summary', 'taskforce'],
      'Closed': ['summary', 'resolution', 'investigation', 'containment']
    };
    
    return relevanceMap[incident.status]?.includes(content) || false;
  };

  const getSectionPriority = (content: string): 'primary' | 'secondary' | 'tertiary' => {
    const priorityMap: Record<IncidentStatus, Record<string, 'primary' | 'secondary' | 'tertiary'>> = {
      'Reporting': {
        'summary': 'primary',
        'impact': 'primary', 
        'taskforce': 'secondary'
      },
      'Investigation': {
        'investigation': 'primary',
        'summary': 'secondary',
        'taskforce': 'secondary',
        'impact': 'tertiary'
      },
      'Containment': {
        'containment': 'primary',
        'taskforce': 'secondary',
        'investigation': 'tertiary',
        'summary': 'tertiary'
      },
      'Resolution': {
        'resolution': 'primary',
        'containment': 'secondary',
        'taskforce': 'secondary',
        'investigation': 'tertiary'
      },
      'Post-Incident Review': {
        'resolution': 'primary',
        'investigation': 'secondary',
        'summary': 'tertiary',
        'taskforce': 'tertiary'
      },
      'Closed': {
        'summary': 'primary',
        'resolution': 'secondary',
        'investigation': 'tertiary',
        'containment': 'tertiary'
      }
    };
    
    return priorityMap[incident.status]?.[content] || 'tertiary';
  };

  const totalImpacted = incident.countryImpact.reduce(
    (sum, c) => sum + (c.impactedVolume ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Content View Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            {viewMode === 'focused' 
              ? `Showing content relevant for ${incident.status} phase`
              : 'Showing all sections'
            }
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'focused' ? 'complete' : 'focused')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {viewMode === 'focused' ? (
              <>
                <EyeIcon className="w-4 h-4" />
                Show All
              </>
            ) : (
              <>
                <EyeSlashIcon className="w-4 h-4" />
                Focus Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      {(viewMode === 'complete' || isRelevantForStatus('summary')) && (
        <ContentSection
          title="Executive Summary"
          isExpanded={expandedSections.summary}
          onToggle={() => toggleSection('summary')}
          priority={getSectionPriority('summary')}
          isRelevant={isRelevantForStatus('summary')}
        >
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Nature of Incident</div>
              <div className="text-gray-900 whitespace-pre-wrap">{incident.natureOfIncident}</div>
            </div>
            
            {incident.additionalDescription?.trim() && (
              <div>
                <div className="text-sm font-medium text-gray-700">Initial details (at intake)</div>
                <div className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed">
                  {incident.additionalDescription}
                </div>
              </div>
            )}
            
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </ContentSection>
      )}

      {/* Impact Analysis */}
      {(viewMode === 'complete' || isRelevantForStatus('impact')) && (
        <ContentSection
          title="Impact Analysis"
          subtitle={`${totalImpacted.toLocaleString()} customers affected`}
          isExpanded={expandedSections.impact}
          onToggle={() => toggleSection('impact')}
          priority={getSectionPriority('impact')}
          isRelevant={isRelevantForStatus('impact')}
        >
          <ImpactAnalysisSection
            incident={incident}
            userEmail={userEmail}
            onUpdated={onUpdated}
          />
        </ContentSection>
      )}

      {/* Task-Force Coordination */}
      {(viewMode === 'complete' || isRelevantForStatus('taskforce')) && (
        <ContentSection
          title="Task-Force Coordination"
          subtitle={incident.assignedTaskForce ? `${incident.assignedTaskForce.assignedMembers.length} members assigned` : 'No team assigned'}
          isExpanded={expandedSections.taskforce}
          onToggle={() => toggleSection('taskforce')}
          priority={getSectionPriority('taskforce')}
          isRelevant={isRelevantForStatus('taskforce')}
        >
          <TaskForceCoordinationSection
            incident={incident}
            userEmail={userEmail}
            onUpdated={onUpdated}
          />
        </ContentSection>
      )}

      {/* Investigation Section */}
      {(incident.status === 'Investigation' || 
        incident.status === 'Containment' || 
        incident.status === 'Resolution' ||
        incident.status === 'Post-Incident Review' ||
        incident.status === 'Closed' ||
        viewMode === 'complete') && (
        <ContentSection
          title="Investigation Details"
          isExpanded={expandedSections.investigation}
          onToggle={() => toggleSection('investigation')}
          priority={getSectionPriority('investigation')}
          isRelevant={isRelevantForStatus('investigation')}
        >
          <div className="space-y-6">
            <EditableField
              label="Root Cause"
              value={rootCause}
              onChange={setRootCause}
              isEditing={editingField === 'rootCause'}
              onEdit={() => setEditingField('rootCause')}
              onSave={() => onSaveField('rootCause', rootCause)}
              onCancel={() => {
                setEditingField(null);
                setRootCause(incident.rootCause || '');
              }}
              placeholder="Describe the root cause..."
              rows={4}
            />

            <EditableField
              label="Technical Resolution"
              value={technicalResolution}
              onChange={setTechnicalResolution}
              isEditing={editingField === 'technicalResolution'}
              onEdit={() => setEditingField('technicalResolution')}
              onSave={() => onSaveField('technicalResolution', technicalResolution)}
              onCancel={() => {
                setEditingField(null);
                setTechnicalResolution(incident.technicalResolution || '');
              }}
              placeholder="Describe the technical resolution..."
              rows={4}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">Risk Assessment</div>
                {editingField !== 'riskAssessment' && (
                  <button
                    onClick={() => setEditingField('riskAssessment')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
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
                      onClick={() => onSaveField('riskAssessment', riskAssessment)}
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
        </ContentSection>
      )}

      {/* Containment Section */}
      {(incident.status === 'Containment' || 
        incident.status === 'Resolution' ||
        incident.status === 'Post-Incident Review' ||
        incident.status === 'Closed' ||
        viewMode === 'complete') && (
        <ContentSection
          title="Containment"
          isExpanded={expandedSections.containment}
          onToggle={() => toggleSection('containment')}
          priority={getSectionPriority('containment')}
          isRelevant={isRelevantForStatus('containment')}
        >
          <EditableField
            label="Containment Measures *"
            value={containmentMeasures}
            onChange={setContainmentMeasures}
            isEditing={editingField === 'containmentMeasures'}
            onEdit={() => setEditingField('containmentMeasures')}
            onSave={() => onSaveField('containmentMeasures', containmentMeasures)}
            onCancel={() => {
              setEditingField(null);
              setContainmentMeasures(incident.containmentMeasures || '');
            }}
            placeholder="Describe what actions were taken to stop the breach..."
            rows={4}
            required
          />
        </ContentSection>
      )}

      {/* Resolution Section */}
      {(incident.status === 'Resolution' ||
        incident.status === 'Post-Incident Review' ||
        incident.status === 'Closed' ||
        viewMode === 'complete') && (
        <ContentSection
          title="Resolution"
          isExpanded={expandedSections.resolution}
          onToggle={() => toggleSection('resolution')}
          priority={getSectionPriority('resolution')}
          isRelevant={isRelevantForStatus('resolution')}
        >
          <div className="space-y-6">
            <EditableField
              label="Resolution Description *"
              value={resolutionDescription}
              onChange={setResolutionDescription}
              isEditing={editingField === 'resolutionDescription'}
              onEdit={() => setEditingField('resolutionDescription')}
              onSave={() => onSaveField('resolutionDescription', resolutionDescription)}
              onCancel={() => {
                setEditingField(null);
                setResolutionDescription(incident.resolutionDescription || '');
              }}
              placeholder="Describe the final resolution and fix..."
              rows={4}
              required
            />

            <EditableField
              label="Preventive Measures *"
              value={preventiveMeasures}
              onChange={setPreventiveMeasures}
              isEditing={editingField === 'preventiveMeasures'}
              onEdit={() => setEditingField('preventiveMeasures')}
              onSave={() => onSaveField('preventiveMeasures', preventiveMeasures)}
              onCancel={() => {
                setEditingField(null);
                setPreventiveMeasures(incident.preventiveMeasures || '');
              }}
              placeholder="Describe measures taken to prevent recurrence..."
              rows={4}
              required
            />
          </div>
        </ContentSection>
      )}
    </div>
  );
}

// Content Section Wrapper
interface ContentSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  priority: 'primary' | 'secondary' | 'tertiary';
  isRelevant: boolean;
}

function ContentSection({ 
  title, 
  subtitle, 
  children, 
  isExpanded, 
  onToggle, 
  priority, 
  isRelevant 
}: ContentSectionProps) {
  const priorityStyles = {
    primary: 'border-blue-200 bg-blue-50/30',
    secondary: 'border-amber-200 bg-amber-50/30',
    tertiary: 'border-gray-200 bg-white'
  };

  return (
    <div className={`rounded-xl border shadow-sm transition-all ${
      priorityStyles[priority]
    } ${isRelevant ? 'ring-2 ring-blue-100' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-white/50 transition-colors rounded-t-xl"
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {priority === 'primary' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Focus
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

// Editable Field Component
interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  placeholder: string;
  rows?: number;
  required?: boolean;
}

function EditableField({
  label,
  value,
  onChange,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder,
  rows = 3,
  required = false
}: EditableFieldProps) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </div>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Edit
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={rows}
            placeholder={placeholder}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-900 whitespace-pre-wrap">
          {value || <span className="text-gray-400 italic">
            {required ? 'Required - Not documented yet' : 'Not documented yet'}
          </span>}
        </div>
      )}
    </div>
  );
}