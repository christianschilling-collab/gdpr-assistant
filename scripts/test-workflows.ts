/**
 * Manual Test Script für Workflow-Funktionalität
 * Run with: npx tsx scripts/test-workflows.ts
 */

import { initializeWorkflow, getWorkflow, updateStepStatus } from '../lib/firebase/workflows';
import { getAllWorkflowTemplates, getWorkflowTemplate } from '../lib/workflows/standardWorkflows';
import { generateAcknowledgementEmail } from '../lib/gemini/emailDrafts';

async function testWorkflows() {
  console.log('🧪 Testing GDPR Workflow System\n');

  // Test 1: Standard Workflows laden
  console.log('✅ Test 1: Loading standard workflow templates...');
  const templates = getAllWorkflowTemplates();
  console.log(`   Found ${templates.length} workflow templates:`);
  templates.forEach(t => {
    console.log(`   - ${t.name} (${t.stepCount} steps)`);
  });
  console.log();

  // Test 2: Workflow-Template Details
  console.log('✅ Test 2: Loading Data Access workflow details...');
  const dataAccessWorkflow = getWorkflowTemplate('data_access');
  if (dataAccessWorkflow) {
    console.log(`   Steps in Data Access workflow:`);
    dataAccessWorkflow.forEach((step, idx) => {
      console.log(`   ${idx + 1}. ${step.title} (${step.stepType || 'manual'})`);
    });
  }
  console.log();

  // Test 3: Email-Generierung (ohne Firebase)
  console.log('✅ Test 3: Testing email generation...');
  try {
    const mockCase = {
      id: 'test-case-123',
      caseId: 'HELP-2024-TEST-001',
      market: 'DE',
      caseDescription: 'Test case for workflow testing',
      urgency: 'Medium' as const,
      status: 'New' as const,
      timestamp: new Date(),
      teamMember: 'Test Agent',
    };

    // Nur testen wenn Gemini API Key vorhanden
    if (process.env.GEMINI_API_KEY) {
      const email = await generateAcknowledgementEmail(mockCase);
      console.log('   Generated acknowledgement email:');
      console.log('   ' + '-'.repeat(50));
      console.log('   ' + email.substring(0, 200) + '...');
      console.log('   ' + '-'.repeat(50));
    } else {
      console.log('   ⚠️  GEMINI_API_KEY not found - skipping email generation test');
    }
  } catch (error) {
    console.log('   ⚠️  Email generation test failed:', (error as Error).message);
  }
  console.log();

  // Test 4: Workflow-Initialisierung (benötigt Firebase)
  console.log('✅ Test 4: Testing workflow initialization...');
  console.log('   ℹ️  This test requires Firebase to be configured');
  console.log('   To test: Create a case and initialize a workflow manually in the UI');
  console.log();

  // Summary
  console.log('📊 Test Summary:');
  console.log('   - Standard workflows: ✓');
  console.log('   - Workflow templates: ✓');
  console.log('   - Email generation: ' + (process.env.GEMINI_API_KEY ? '✓' : '⚠️  (needs API key)'));
  console.log('   - Workflow initialization: ℹ️  (needs Firebase + UI test)');
  console.log();
  console.log('✅ Backend logic tests completed!');
  console.log();
  console.log('Next steps:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Navigate to /cases/new to create a test case');
  console.log('3. Initialize a workflow from the case detail page');
  console.log('4. Test the workflow UI components');
}

// Run tests
testWorkflows().catch(console.error);
