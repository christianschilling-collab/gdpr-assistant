'use client';

import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  CheckBadgeIcon 
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid 
} from '@heroicons/react/24/solid';
import { IncidentStatus } from '@/lib/types';

interface WorkflowStepperProps {
  currentStatus: IncidentStatus;
  onStatusChange: (status: IncidentStatus) => void;
  disabled?: boolean;
  className?: string;
}

const WORKFLOW_STEPS = [
  {
    id: 'Reporting' as IncidentStatus,
    label: 'Reporting',
    shortLabel: 'Report',
    description: 'Initial incident reporting and triage',
    icon: ExclamationTriangleIcon,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
  {
    id: 'Investigation' as IncidentStatus,
    label: 'Investigation',
    shortLabel: 'Investigate',
    description: 'Root cause analysis and impact assessment',
    icon: MagnifyingGlassIcon,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-600',
  },
  {
    id: 'Containment' as IncidentStatus,
    label: 'Containment',
    shortLabel: 'Contain',
    description: 'Measures to stop the breach',
    icon: ShieldCheckIcon,
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-600',
  },
  {
    id: 'Resolution' as IncidentStatus,
    label: 'Resolution',
    shortLabel: 'Resolve',
    description: 'Final resolution and preventive measures',
    icon: CheckBadgeIcon,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
  {
    id: 'Post-Incident Review' as IncidentStatus,
    label: 'Post-Incident Review',
    shortLabel: 'Review',
    description: 'Lessons learned and documentation',
    icon: CheckCircleIcon,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
  },
  {
    id: 'Closed' as IncidentStatus,
    label: 'Closed',
    shortLabel: 'Closed',
    description: 'Incident fully resolved and archived',
    icon: CheckCircleIcon,
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
  },
];

export function WorkflowStepper({ currentStatus, onStatusChange, disabled = false, className = '' }: WorkflowStepperProps) {
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => step.id === currentStatus);
  const currentStep = WORKFLOW_STEPS[currentStepIndex];
  const nextStep = currentStepIndex < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[currentStepIndex + 1] : null;

  function getStepState(stepIndex: number) {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  }

  function canAdvanceToStep(stepIndex: number): boolean {
    // Can only advance to the next step
    return stepIndex === currentStepIndex + 1 && !disabled;
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header with Current Step Info */}
      <div className={`p-6 border-b border-gray-200 ${currentStep.bgColor}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${currentStep.bgColor} ${currentStep.borderColor} border-2`}>
            <currentStep.icon className={`w-8 h-8 ${currentStep.iconColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className={`text-2xl font-bold ${currentStep.textColor}`}>
                {currentStep.label}
              </h2>
              <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 border border-gray-200">
                Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length}
              </span>
            </div>
            <p className="text-gray-700 text-lg">{currentStep.description}</p>
          </div>
          {nextStep && (
            <button
              onClick={() => onStatusChange(nextStep.id)}
              disabled={disabled}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center gap-2"
            >
              <span>Advance to {nextStep.shortLabel}</span>
              <CheckBadgeIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, index) => {
            const state = getStepState(index);
            const isClickable = canAdvanceToStep(index);

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() => isClickable ? onStatusChange(step.id) : undefined}
                    disabled={!isClickable}
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative
                      ${state === 'completed' 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : state === 'current'
                          ? `${step.bgColor} ${step.borderColor} ${step.textColor}`
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }
                      ${isClickable ? 'hover:scale-110 cursor-pointer' : ''}
                    `}
                  >
                    {state === 'completed' ? (
                      <CheckCircleIconSolid className="w-6 h-6" />
                    ) : state === 'current' ? (
                      <ClockIconSolid className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                    
                    {/* Pulse animation for current step */}
                    {state === 'current' && (
                      <span className="absolute inset-0 rounded-full border-2 border-current animate-pulse opacity-30"></span>
                    )}
                  </button>
                  
                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <div className={`text-sm font-medium ${
                      state === 'completed' || state === 'current' 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                    }`}>
                      {step.shortLabel}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {state === 'completed' ? '✓ Done' : 
                       state === 'current' ? 'In Progress' : 
                       'Pending'}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    index < currentStepIndex ? 'bg-emerald-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: Current Step Progress */}
        <div className="mt-6 sm:hidden">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentStepIndex + 1} / {WORKFLOW_STEPS.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / WORKFLOW_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Description for Mobile */}
        <div className="mt-4 sm:hidden p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-1">{currentStep.label}</h3>
          <p className="text-sm text-gray-600">{currentStep.description}</p>
        </div>
      </div>
    </div>
  );
}

// Helper component for step-based content rendering
interface WorkflowContentProps {
  currentStatus: IncidentStatus;
  children: {
    reporting?: React.ReactNode;
    investigation?: React.ReactNode;
    containment?: React.ReactNode;
    resolution?: React.ReactNode;
    review?: React.ReactNode;
    closed?: React.ReactNode;
  };
}

export function WorkflowContent({ currentStatus, children }: WorkflowContentProps) {
  const content = {
    'Reporting': children.reporting,
    'Investigation': children.investigation,
    'Containment': children.containment,
    'Resolution': children.resolution,
    'Post-Incident Review': children.review,
    'Closed': children.closed,
  };

  return <div>{content[currentStatus]}</div>;
}