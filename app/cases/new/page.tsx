'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCase } from '@/lib/firebase/cases';
import { generateCaseId } from '@/lib/firebase/cases';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { Category, RequesterType } from '@/lib/types';
import HelpButton from '@/components/HelpButton';
import { useToast } from '@/lib/contexts/ToastContext';

export default function NewCasePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<1 | 2>(1);
  
  // Categories & Requester Types
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form Data
  const [formData, setFormData] = useState({
    caseId: '',
    teamMember: '',
    market: '',
    caseDescription: '',
    specificQuestion: '',
    urgency: 'Medium' as 'Low' | 'Medium' | 'High',
    // GDPR-compliant fields (NO PII!)
    customerNumber: '',      // OK: Customer reference
    jiraLink: '',           // External link
    mineosLink: '',         // External link
    owlLink: '',            // External link
    isGmail: false,         // Checkbox
  });

  // Classification Data
  const [classificationMethod, setClassificationMethod] = useState<'manual' | 'ai'>('ai'); // Default: AI
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]); // Multiple categories
  const [selectedRequesterType, setSelectedRequesterType] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingData(true);
    setError('');

    const fetchLists = async () => {
      const [cats, types] = await Promise.all([
        getCategories(true),
        getRequesterTypes(true),
      ]);
      setCategories(cats);
      setRequesterTypes(types);
    };

    try {
      await fetchLists();
    } catch (err: any) {
      console.error('Error loading data:', err);
      try {
        await new Promise((r) => setTimeout(r, 300));
        await fetchLists();
      } catch (e2: any) {
        console.error('Error loading data (retry):', e2);
        setError('Failed to load categories and requester types');
      }
    } finally {
      setLoadingData(false);
    }
  }

  function handleStep1Next() {
    // For workflow testing: Make Requester Type optional temporarily
    if (!formData.caseDescription || !formData.teamMember || !formData.market) {
      setError('Please fill in all required fields (Description, Team Member, Market)');
      return;
    }
    
    // If Requester Type not selected, default to first available type
    if (!selectedRequesterType && requesterTypes.length > 0) {
      setSelectedRequesterType(requesterTypes[0].id);
    }
    
    setError('');
    setStep(2);
  }

  async function handleStep2Next() {
    // Requester Type is already selected in Step 1
    if (classificationMethod === 'manual') {
      if (selectedCategories.length === 0) {
        setError('Please select at least one Category');
        return;
      }
    }
    
    setError('');
    
    // Directly create the case
    await handleSubmit(new Event('submit') as any);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 🔒 STEP 1: Sanitize PII from case description
      let sanitizedDescription = formData.caseDescription;
      try {
        const sanitizeResponse = await fetch('/api/sanitize-pii', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formData.caseDescription })
        });

        if (sanitizeResponse.ok) {
          const sanitizeData = await sanitizeResponse.json();
          if (sanitizeData.success && sanitizeData.sanitizedText) {
            sanitizedDescription = sanitizeData.sanitizedText;
            
            // Log what was found and sanitized
            if (sanitizeData.piiFound) {
              const piiCount = 
                sanitizeData.piiFound.names.length + 
                sanitizeData.piiFound.emails.length + 
                sanitizeData.piiFound.addresses.length + 
                sanitizeData.piiFound.phoneNumbers.length;
              
              if (piiCount > 0) {
                console.log('🔒 PII sanitized:', piiCount, 'items removed');
              }
            }
          }
        }
      } catch (sanitizeError) {
        console.warn('⚠️ PII sanitization failed, proceeding with original text:', sanitizeError);
        // Continue with original text if sanitization fails
      }

      // Generate case ID if not provided
      const finalCaseId = formData.caseId || generateCaseId(
        new Date().getFullYear(),
        Math.floor(Math.random() * 999) + 1
      );

      // Build case object without undefined fields
      const caseData: any = {
        caseId: finalCaseId,
        timestamp: new Date(),
        teamMember: formData.teamMember,
        market: formData.market,
        caseDescription: sanitizedDescription, // ✅ Now sanitized
        urgency: formData.urgency,
        status: 'New',
        classificationMethod,
      };

      // Add GDPR-compliant fields if provided
      if (formData.customerNumber && formData.customerNumber.trim()) {
        caseData.customerNumber = formData.customerNumber;
      }
      if (formData.jiraLink && formData.jiraLink.trim()) {
        caseData.jiraLink = formData.jiraLink;
      }
      if (formData.mineosLink && formData.mineosLink.trim()) {
        caseData.mineosLink = formData.mineosLink;
      }
      if (formData.owlLink && formData.owlLink.trim()) {
        caseData.owlLink = formData.owlLink;
      }
      
      // Always set isGmail (true or false)
      caseData.isGmail = formData.isGmail;

      // Only add specificQuestion if it has a value
      if (formData.specificQuestion && formData.specificQuestion.trim()) {
        caseData.specificQuestion = formData.specificQuestion;
      }

      // AI Classification
      if (classificationMethod === 'ai') {
        // Requester Type is always selected manually
        caseData.customerType = selectedRequesterType;
        
        // Use API route to call AI (server-side)
        const response = await fetch('/api/classify-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseDescription: formData.caseDescription,
            requesterTypeId: selectedRequesterType,
            specificQuestion: formData.specificQuestion,
            market: formData.market,
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
            customerAddress: formData.customerAddress,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'AI classification failed');
        }

        const result = await response.json();
        caseData.primaryCategory = result.classification.primaryCategory;
        
        // Use AI-extracted details if available and fields are empty
        if (result.extractedDetails) {
          if (result.extractedDetails.customerName && !caseData.customerName) {
            caseData.customerName = result.extractedDetails.customerName;
          }
          if (result.extractedDetails.customerEmail && !caseData.customerEmail) {
            caseData.customerEmail = result.extractedDetails.customerEmail;
          }
          if (result.extractedDetails.customerAddress && !caseData.customerAddress) {
            caseData.customerAddress = result.extractedDetails.customerAddress;
          }
        }
      } else {
        // Manual Classification
        if (selectedCategories.length > 0) {
          caseData.primaryCategory = selectedCategories[0];
        }
        if (selectedRequesterType) {
          caseData.customerType = selectedRequesterType;
        }
      }

      const newCaseId = await createCase(caseData);

      // 🔥 AUTO-WORKFLOW: Try to initialize workflow
      try {
        console.log('🔄 Checking for workflow mapping...');
        console.log('  Category:', caseData.primaryCategory);
        console.log('  Requester Type:', caseData.customerType);
        
        let workflowTemplateId: string | null = null;
        
        // Try loading from Firestore first
        try {
          const { getWorkflowTemplateForCase } = await import('@/lib/firebase/workflowMappings');
          workflowTemplateId = await getWorkflowTemplateForCase(
            caseData.primaryCategory,
            caseData.customerType
          );
        } catch (firestoreError) {
          console.warn('⚠️ Could not load from Firestore (Rules not deployed?), using defaults');
        }
        
        // 🔥 FALLBACK: Use hardcoded mappings if Firestore fails
        if (!workflowTemplateId) {
          const { getCategories } = await import('@/lib/firebase/categories');
          const { getRequesterTypes } = await import('@/lib/firebase/requesterTypes');
          
          const [cats, types] = await Promise.all([
            getCategories(true),
            getRequesterTypes(true)
          ]);
          
          const category = cats.find(c => c.id === caseData.primaryCategory);
          const requesterType = types.find(t => t.id === caseData.customerType);
          
          console.log('  Category name:', category?.name);
          console.log('  Requester Type name:', requesterType?.name);
          
          // Hardcoded mapping based on category names
          if (category?.name.includes('Auskunft') || category?.nameEn.includes('Access')) {
            workflowTemplateId = 'data_access';
          } else if (category?.name.includes('Werbung') || category?.nameEn.includes('Marketing')) {
            workflowTemplateId = 'marketing_opt_out';
          } else if (category?.name.includes('Löschung') || category?.nameEn.includes('Deletion')) {
            workflowTemplateId = 'data_deletion';
          } else if (category?.name.includes('Übertragbar') || category?.nameEn.includes('Portability')) {
            workflowTemplateId = 'data_portability';
          } else if (category?.name.includes('Berichtigung') || category?.nameEn.includes('Correction')) {
            workflowTemplateId = 'data_correction';
          }
        }
        
        if (workflowTemplateId) {
          console.log('✅ Workflow template determined:', workflowTemplateId);
          console.log('🔄 Initializing workflow...');
          
          const { initializeWorkflow } = await import('@/lib/firebase/workflows');
          await initializeWorkflow(newCaseId, workflowTemplateId);
          
          console.log('✅ Workflow initialized successfully!');
          showToast('✅ Case created with workflow!', 'success');
        } else {
          console.log('ℹ️ No workflow mapping found for this combination');
          showToast('Case created successfully', 'success');
        }
      } catch (workflowError: any) {
        console.error('⚠️ Workflow initialization failed:', workflowError);
        // Don't block case creation if workflow fails
        showToast('Case created (workflow initialization failed)', 'warning');
      }

      // Redirect to case detail view
      router.push(`/cases/${newCaseId}`);
    } catch (error: any) {
      console.error('Error creating case:', error);
      setError(error.message || 'Failed to create case. Please try again.');
      showToast(error.message || 'Failed to create case', 'error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Create New Case</h1>
              <HelpButton topic="Cases" />
            </div>
            <p className="text-gray-600 mt-1">Add a new GDPR request case</p>
          </div>
          <Link
            href="/cases"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Cases
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              <p className={`text-sm mt-2 ${step >= 1 ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                1. Case Information
              </p>
            </div>
            <div className="flex-1 ml-4">
              <div className={`h-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              <p className={`text-sm mt-2 ${step >= 2 ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                2. Classification & Create
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Step 1: Case Information */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Step 1: Enter Case Information</h2>
            
            <div className="space-y-6">
              {/* Requester Type - FIRST AND MOST IMPORTANT */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4">
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Who is making the request? <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-600 font-normal ml-2">(Most important - select first!)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {requesterTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedRequesterType(type.id)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        selectedRequesterType === type.id
                          ? 'border-indigo-600 bg-white shadow-md'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <h4 className="font-semibold text-gray-900 text-sm">{type.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Case Description with PII Warning */}
              <div>
                <label htmlFor="caseDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Case Description / Customer Message <span className="text-red-500">*</span>
                </label>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-2">
                  <p className="text-xs text-yellow-900">
                    ⚠️ <strong>IMPORTANT - GDPR Compliance:</strong> Do NOT include personal data (names, email addresses, physical addresses) in this field. 
                    Our AI will automatically remove any PII before saving. Use placeholders like [NAME], [EMAIL], [ADDRESS] if needed.
                  </p>
                </div>
                <textarea
                  id="caseDescription"
                  required
                  rows={8}
                  value={formData.caseDescription}
                  onChange={(e) => setFormData({ ...formData, caseDescription: e.target.value })}
                  placeholder="Paste the customer's GDPR request here... (Personal data will be automatically sanitized)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Customer Reference - GDPR Compliant */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Customer Reference (GDPR-Safe)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerNumber" className="block text-xs text-gray-700 mb-1">
                      Customer Number
                    </label>
                    <input
                      type="text"
                      id="customerNumber"
                      value={formData.customerNumber}
                      onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                      placeholder="e.g., 12345678"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="market" className="block text-xs text-gray-700 mb-1">
                      Market <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="market"
                      value={formData.market}
                      onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="AT">Austria (AT)</option>
                      <option value="CH">Switzerland (CH)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* External System Links */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">External System Links (Optional)</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="jiraLink" className="block text-xs text-gray-600 mb-1">
                      Jira Link
                    </label>
                    <input
                      type="url"
                      id="jiraLink"
                      value={formData.jiraLink}
                      onChange={(e) => setFormData({ ...formData, jiraLink: e.target.value })}
                      placeholder="https://jira.company.com/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="mineosLink" className="block text-xs text-gray-600 mb-1">
                      MineOS Link
                    </label>
                    <input
                      type="url"
                      id="mineosLink"
                      value={formData.mineosLink}
                      onChange={(e) => setFormData({ ...formData, mineosLink: e.target.value })}
                      placeholder="https://mineos.company.com/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="owlLink" className="block text-xs text-gray-600 mb-1">
                      OWL Link
                    </label>
                    <input
                      type="url"
                      id="owlLink"
                      value={formData.owlLink}
                      onChange={(e) => setFormData({ ...formData, owlLink: e.target.value })}
                      placeholder="https://owl.company.com/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isGmail}
                      onChange={(e) => setFormData({ ...formData, isGmail: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">This case came from Gmail</span>
                  </label>
                </div>
              </div>

              {/* Team Member (Dropdown) */}
              <div>
                <label htmlFor="teamMember" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <select
                  id="teamMember"
                  required
                  value={formData.teamMember}
                  onChange={(e) => setFormData({ ...formData, teamMember: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select your name</option>
                  <option value="Chris">Chris</option>
                  <option value="Sema">Sema</option>
                  <option value="Melina">Melina</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency <span className="text-red-500">*</span>
                </label>
                <select
                  id="urgency"
                  required
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as 'Low' | 'Medium' | 'High' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
              <Link
                href="/cases"
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={handleStep1Next}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Next: Classification →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Classification */}
        {step === 2 && (
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Classification (2/3 width) */}
            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Step 2: Classify the Request</h2>

              {loadingData ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-gray-600 mt-4">Loading options...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Classification Method */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">How would you like to classify the category?</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setClassificationMethod('ai')}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          classificationMethod === 'ai'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">🤖</div>
                        <h3 className="font-semibold text-gray-900">AI Classification</h3>
                        <p className="text-sm text-gray-600 mt-1">Let AI analyze category (recommended)</p>
                      </button>

                      <button
                        onClick={() => setClassificationMethod('manual')}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          classificationMethod === 'manual'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">👤</div>
                        <h3 className="font-semibold text-gray-900">Manual Selection</h3>
                        <p className="text-sm text-gray-600 mt-1">Select category yourself</p>
                      </button>
                    </div>
                  </div>

                  {/* Categories - Manual or AI */}
                  {classificationMethod === 'manual' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        What type(s) of request is this? <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-500 ml-2">(Select multiple if needed)</span>
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {categories.map((cat) => {
                          const isSelected = selectedCategories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                                } else {
                                  setSelectedCategories([...selectedCategories, cat.id]);
                                }
                              }}
                              className={`p-3 border-2 rounded-lg text-left transition-all flex items-start gap-3 ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {isSelected ? (
                                  <span className="text-lg">✅</span>
                                ) : (
                                  <span className="text-lg">⬜</span>
                                )}
                              </div>
                              {cat.icon && <span className="text-2xl">{cat.icon}</span>}
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                                <p className="text-xs text-gray-600 mt-1">{cat.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI Classification Info */}
                  {classificationMethod === 'ai' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>ℹ️ AI Classification:</strong> The AI will analyze the case description and automatically 
                        determine the <strong>category</strong> based on the selected requester type. You can review and adjust after creation.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={loadingData || loading}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      ✓ Create Case
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Preview (1/3 width) */}
            <div className="col-span-1 bg-gray-50 rounded-xl border border-gray-200 p-4 sticky top-8 self-start max-h-[600px] overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Case Preview
              </h3>
              <div className="space-y-3 text-xs">
                {/* Requester Type - PROMINENT */}
                {selectedRequesterType && (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-lg p-3">
                    <span className="font-bold text-gray-900 block mb-1">Requester Type:</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold inline-block ${
                      requesterTypes.find(t => t.id === selectedRequesterType)?.nameEn.toLowerCase().includes('customer')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {requesterTypes.find(t => t.id === selectedRequesterType)?.name || 'Selected'}
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="font-semibold text-gray-700">Description:</span>
                  <p className="text-gray-600 mt-1 bg-white p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
                    {formData.caseDescription || <span className="text-gray-400 italic">Not entered yet</span>}
                  </p>
                </div>
                
                {formData.customerName && (
                  <div>
                    <span className="font-semibold text-gray-700">Customer:</span>
                    <p className="text-gray-600 mt-1">{formData.customerName}</p>
                  </div>
                )}

                {formData.customerEmail && (
                  <div>
                    <span className="font-semibold text-gray-700">Email:</span>
                    <p className="text-gray-600 mt-1">{formData.customerEmail}</p>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-gray-700">Team Member:</span>
                  <p className="text-gray-600 mt-1">{formData.teamMember || <span className="text-gray-400 italic">Not selected</span>}</p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Market:</span>
                  <p className="text-gray-600 mt-1">{formData.market || <span className="text-gray-400 italic">Not selected</span>}</p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Urgency:</span>
                  <p className="text-gray-600 mt-1">{formData.urgency}</p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700">Source:</span>
                  <p className="text-gray-600 mt-1">{formData.sourceIsGmail ? '✉️ Gmail' : (formData.sourceLink || <span className="text-gray-400 italic">Not entered</span>)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
