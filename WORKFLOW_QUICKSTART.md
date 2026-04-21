# Quick Start: Workflow Management + Approved Email Templates

## 🎯 Goal

1. Assign workflows to specific Case Type + Requester Type combinations
2. Ensure AI-generated emails use approved templates from Firestore

---

## 📋 Step-by-Step Setup

### 1️⃣ Set Up Workflow Mappings

**Access Admin Panel:**
```
http://localhost:3000/admin/workflows
```

**Configure Mappings:**

1. You'll see a table with:
   - **Rows**: Case Types (Categories) like "Datenauskunft", "Werbewiderruf", etc.
   - **Columns**: Requester Types like "Customer", "Employee", etc.

2. For each combination, select a workflow template from the dropdown:
   - `data_access` - 6 steps (Acknowledgement, ID Request, Data Collection, etc.)
   - `marketing_opt_out` - 4 steps (Acknowledgement, Deactivate, Confirm)
   - `data_deletion` - 5 steps (Acknowledgement, ID Request, Delete, Confirm)
   - `data_portability` - 5 steps (Acknowledgement, Export, Deliver)
   - `data_correction` - 4 steps (Acknowledgement, Update, Confirm)

3. Click **"💾 Save Mappings"**

**Result:** When you create a new case with a specific Category + Requester Type, the matching workflow will auto-initialize!

---

### 2️⃣ Add Approved Email Templates

**Option A: Via Firestore Console** (Fastest)

1. Go to: Firebase Console → Firestore Database
2. Navigate to `templates` collection
3. Click **"Add Document"**
4. Fill in:

```javascript
{
  // Required fields
  "primaryCategory": "Datenauskunft",
  "requesterType": "Customer",
  "templateName": "Data Access Acknowledgement Email",
  "templateText": `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage bezüglich Ihrer personenbezogenen Daten. Wir haben Ihre Anfrage erhalten und werden diese gemäß Art. 12 Abs. 3 DSGVO innerhalb von 30 Tagen bearbeiten.

Ihre Referenznummer: {{CASE_ID}}

Sollten Sie weitere Fragen haben, kontaktieren Sie uns gerne.

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
  
  // IMPORTANT: Keywords for matching
  "keywords": ["email", "acknowledgement", "eingangsbestätigung", "antwort"],
  
  // Optional metadata
  "whenToUse": "Send immediately after receiving a data access request",
  "confluenceLink": "",
  "mineosAuto": false,
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>,
  "version": "1.0"
}
```

5. Click **"Save"**

**Option B: Via Admin UI** (More user-friendly)

1. Go to: `http://localhost:3000/admin/templates/new`
2. Fill in form:
   - **Primary Category**: Select "Datenauskunft"
   - **Requester Type**: Select "Customer"
   - **Template Name**: "Data Access Acknowledgement Email"
   - **Template Text**: Paste the email body (include {{CASE_ID}} placeholders)
   - **Keywords**: Add "email, acknowledgement, eingangsbestätigung"
   - **When to Use**: "Send immediately after receiving request"
3. Click **"Save"**

---

### 3️⃣ Test the Integration

**Step 1: Create a Test Case**

1. Go to: `http://localhost:3000/cases/new`
2. Fill in:
   - **Category**: "Datenauskunft"
   - **Requester Type**: "Customer"
   - **Description**: "Test case for workflow"
   - **Market**: DE
   - **Team Member**: Your name
3. Click **"Create Case"**

**Step 2: Verify Workflow Initialized**

1. You should be redirected to the case details page
2. You should see:
   - ✅ **Workflow Timeline** with all steps
   - ✅ **Current Step Card** showing "Step 1: Send Acknowledgement Email"
   - ✅ **Progress Bar**: "1 / 6 Steps Completed"

**Step 3: Generate Email from Approved Template**

1. In the "Current Step" card, click **"✨ Generate Email"**
2. Wait 2-3 seconds for AI to generate
3. Verify:
   - ✅ Email body matches your approved template
   - ✅ `{{CASE_ID}}` is replaced with actual case ID (e.g., "2026-001")
   - ✅ Wording is EXACTLY as in your approved template

**Step 4: Complete the Step**

1. Review the generated email
2. Edit if needed (you can customize before sending)
3. Click **"✅ Complete Step"**
4. Workflow advances to next step!

---

## 🔥 How It Works Behind the Scenes

### Workflow Auto-Initialization

```typescript
// When case is created:
1. System looks up: workflowMappings/{categoryId-requesterTypeId}
2. Gets: workflowTemplateId (e.g., "data_access")
3. Calls: initializeWorkflow(caseId, "data_access")
4. Creates: workflows/{workflowId} with all steps
5. Links: case.workflow reference
```

### Email Generation with Approved Template

```typescript
// When "Generate Email" is clicked:
1. loadApprovedTemplate(caseData, "acknowledgement")
   → Searches: templates collection
   → Matches: primaryCategory + requesterType + keywords
   → Returns: approved template text

2. generateEmailDraft(step, caseData)
   → AI receives: approved template as STRICT base
   → AI instructions: "DO NOT CHANGE WORDING, ONLY REPLACE PLACEHOLDERS"
   → AI output: Template with {{CASE_ID}} → "2026-001"

3. Display in CurrentStepCard
   → User can review/edit before sending
```

---

## 📊 Verification Checklist

### Workflow Mappings Working?

- [ ] Admin page loads: `/admin/workflows`
- [ ] See table with Case Types × Requester Types
- [ ] Can select workflows from dropdowns
- [ ] Click "Save" → Success message appears
- [ ] Reload page → Mappings are still there (saved to Firestore)

### Approved Templates Working?

- [ ] Template exists in Firestore `templates` collection
- [ ] Template has `keywords` array with email type (e.g., "acknowledgement")
- [ ] Template has `primaryCategory` and `requesterType` matching your test case
- [ ] Create case → Initialize workflow → "Generate Email"
- [ ] Generated email uses EXACT wording from approved template
- [ ] Only placeholders ({{CASE_ID}}, etc.) are replaced

---

## 🛠️ Troubleshooting

### "Workflow not initializing"

- Check `/admin/workflows` - is there a mapping for your Category + Requester Type?
- Check console logs - any Firebase errors?
- Check Firestore Rules - is `workflowMappings` collection readable?

### "Generated email doesn't use approved template"

- Check template `keywords` - does it include the email category? (e.g., "acknowledgement", "email")
- Check template `primaryCategory` and `requesterType` - do they match your case?
- Check console logs - is the template being loaded? (search for "approved template")
- Fallback: If no approved template found, AI uses default template (expected behavior)

### "Error: Missing or insufficient permissions"

- Update Firestore Rules (see `firestore.rules`):
  ```javascript
  match /workflowMappings/{mappingId} {
    allow read, write: if true;
  }
  ```
- Deploy rules: Firebase Console → Firestore → Rules → Publish

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ **Admin page shows workflow mappings table** with dropdowns
2. ✅ **"Save Mappings" button works** and shows success message
3. ✅ **New case auto-initializes workflow** (you see timeline immediately)
4. ✅ **"Generate Email" produces approved template text** (exact wording)
5. ✅ **Workflow progresses through steps** when you complete them

---

## 📚 More Info

- **Full Documentation**: See `WORKFLOW_MANAGEMENT_GUIDE.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **Architecture Overview**: See `WORKFLOW_README.md`

---

## 🚀 Next Steps

Once basic setup works:

1. Add more approved templates for different email types
2. Configure mappings for all Case Type + Requester Type combinations
3. Test with real agent workflows
4. Monitor workflow analytics: `/analytics/workflows`
5. Customize workflows per market/requester type

**Happy Workflow Building! 🎯**
