# Workflow Management & Email Templates

This document explains how to manage workflows and ensure email generation uses approved templates.

---

## 1️⃣ Workflow Management per Case Type + Requester Type

### Overview

The GDPR Assistant allows you to assign specific workflow templates to each combination of **Case Type** (Category) and **Requester Type**. When a case is created, the system automatically initializes the matching workflow.

### Access Workflow Management

Navigate to: **`/admin/workflows`**

### Features

- **Visual Mapping Table**: See all Case Types × Requester Types combinations
- **Dropdown Selection**: Assign workflows to each combination
- **Auto-Save to Firestore**: Mappings are persisted in `workflowMappings` collection
- **Auto-Load on Case Creation**: When creating a case, the matching workflow is automatically initialized

### How It Works

1. **Admin Configuration**: 
   - Go to `/admin/workflows`
   - Select workflow template for each Case Type + Requester Type combination
   - Click "Save Mappings"

2. **Firestore Storage**:
   ```
   Collection: workflowMappings
   Document ID: {categoryId}-{requesterTypeId}
   Fields:
     - categoryId: string
     - categoryName: string
     - requesterTypeId: string
     - requesterTypeName: string
     - workflowTemplateId: string (e.g., "data_access")
     - workflowTemplateName: string
     - createdAt: timestamp
     - updatedAt: timestamp
   ```

3. **Auto-Initialization**:
   - When a case is created with a specific Category + Requester Type
   - System looks up the workflow mapping
   - Automatically calls `initializeWorkflow(caseId, workflowTemplateId)`

### Example Mappings

| Case Type | Requester Type | Workflow Template |
|-----------|----------------|-------------------|
| Datenauskunft | Customer | `data_access` (6 steps) |
| Datenauskunft | Employee | `data_access` (6 steps) |
| Werbewiderruf | Customer | `marketing_opt_out` (4 steps) |
| Datenlöschung | Customer | `data_deletion` (5 steps) |

### API Functions

```typescript
// Get workflow template ID for a case
import { getWorkflowTemplateForCase } from '@/lib/firebase/workflowMappings';

const workflowTemplateId = await getWorkflowTemplateForCase(
  caseData.primaryCategory,
  caseData.requesterType
);

if (workflowTemplateId) {
  await initializeWorkflow(caseData.caseId, workflowTemplateId);
}
```

---

## 2️⃣ Email Generation with Approved Templates

### Overview

Previously, the AI generated emails from scratch. Now, it uses **approved email templates from Firestore** as the base, ensuring compliance and consistency.

### How It Works

1. **Template Storage**:
   - Approved email templates are stored in Firestore (`templates` collection)
   - Each template has:
     - `primaryCategory`: e.g., "Datenauskunft"
     - `requesterType`: e.g., "Customer"
     - `templateText`: The approved email body
     - `keywords`: e.g., ["email", "antwort", "acknowledgement"]

2. **Template Matching**:
   ```typescript
   // System automatically loads matching template
   const approvedTemplate = await loadApprovedTemplate(
     caseData,
     emailCategory // e.g., 'acknowledgement'
   );
   ```

3. **AI Generation**:
   - If approved template found: AI uses it as **strict base** (only replaces placeholders)
   - If no approved template: AI generates from fallback template
   - AI receives explicit instructions: "DO NOT CHANGE WORDING, ONLY REPLACE PLACEHOLDERS"

### AI Prompt Example

When an approved template is found:

```
⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):

Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage. Ihre Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team

Instructions:
1. Keep the approved template structure EXACTLY as is
2. Only replace placeholders like {{CASE_ID}}, {{CUSTOMER_NAME}}, etc.
3. Do NOT change wording, tone, or legal references

⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.
```

### Template Matching Logic

```typescript
// Matches templates based on:
1. primaryCategory === caseData.primaryCategory
2. requesterType === caseData.requesterType
3. keywords.includes(emailCategory) // e.g., "acknowledgement", "email", "antwort"

// Example:
Template: {
  primaryCategory: "Datenauskunft",
  requesterType: "Customer",
  keywords: ["email", "acknowledgement", "eingangsbestätigung"],
  templateText: "Sehr geehrte Damen und Herren, ..."
}

// Will be used for:
- Case: Datenauskunft + Customer
- Email Step: 'acknowledgement' category
```

### Adding New Approved Templates

1. **Via Firestore Console**:
   - Go to Firestore > `templates` collection
   - Add new document with fields:
     - `primaryCategory`: string
     - `requesterType`: string
     - `keywords`: array of strings (include email type keywords)
     - `templateText`: string (the approved email body)
     - `templateName`: string
     - `whenToUse`: string

2. **Via Admin UI** (existing):
   - Go to `/admin/templates/new`
   - Fill in template details
   - Include keywords like "email", "antwort", "acknowledgement", etc.

### Supported Email Categories

| Category | When Used | Keyword Examples |
|----------|-----------|------------------|
| `acknowledgement` | Initial response confirming receipt | "acknowledgement", "eingangsbestätigung", "email" |
| `id_request` | Request identity verification | "id_request", "identität", "verifizierung" |
| `negative_response` | No data found | "negative", "keine daten", "negative_response" |
| `data_package` | Send data export | "data_package", "datenpaket", "auskunft" |
| `marketing_opt_out` | Confirm marketing unsubscribe | "marketing", "werbewiderruf", "opt_out" |

### Benefits

✅ **Compliance**: Legal team approves templates once, AI uses them consistently  
✅ **Brand Voice**: Consistent tone and wording across all emails  
✅ **Flexibility**: AI still adapts to context by filling placeholders intelligently  
✅ **Fallback**: System works even without approved templates (uses defaults)  
✅ **Auditability**: All templates stored in Firestore with version history  

### Verification

To verify an email was generated from an approved template:

1. Check Firestore `templates` collection for matching template
2. Review generated email - should have exact wording from template
3. Only placeholders ({{CASE_ID}}, etc.) should be replaced

---

## Implementation Files

### Workflow Mappings
- **`lib/firebase/workflowMappings.ts`**: Firestore CRUD operations
- **`app/admin/workflows/page.tsx`**: Admin UI for mapping management

### Email Generation
- **`lib/gemini/emailDrafts.ts`**: AI email generation with approved templates
- **`lib/firebase/templates.ts`**: Template loading from Firestore

### Integration Points
- **`lib/firebase/workflows.ts`**: `initializeWorkflow()` - uses mappings
- **`components/WorkflowComponents.tsx`**: "Generate Email" button - uses approved templates

---

## Firestore Rules

Ensure these collections have appropriate rules in `firestore.rules`:

```javascript
// Workflow Mappings
match /workflowMappings/{mappingId} {
  allow read: if true;
  allow write: if request.auth != null; // Admin only
}

// Templates (existing)
match /templates/{templateId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

---

## Testing

### Test Workflow Mappings
1. Go to `/admin/workflows`
2. Assign workflows to different Case Type + Requester Type combinations
3. Create a new case with specific Category + Requester Type
4. Verify workflow auto-initializes with correct template

### Test Approved Templates
1. Create an approved template in Firestore:
   ```
   {
     primaryCategory: "Datenauskunft",
     requesterType: "Customer",
     keywords: ["email", "acknowledgement"],
     templateText: "Sehr geehrte Damen und Herren, TEST TEMPLATE {{CASE_ID}}"
   }
   ```
2. Create a case with Category = "Datenauskunft", Requester Type = "Customer"
3. Initialize workflow
4. Click "Generate Email" for acknowledgement step
5. Verify generated email uses "TEST TEMPLATE" wording

---

## Next Steps

- [ ] Add UI to create approved email templates directly from workflow steps
- [ ] Version control for approved templates
- [ ] A/B testing different email templates
- [ ] Analytics: Email open rates, response times per template
- [ ] Multi-language support for approved templates
