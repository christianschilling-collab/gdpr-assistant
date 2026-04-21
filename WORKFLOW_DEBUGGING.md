# 🐛 Workflow Testing & Debugging

## Current Issues

### 1️⃣ "Generate Email" funktioniert nicht

**Ursache:** Gemini API wird aufgerufen, aber:
- Gemini API Key könnte fehlen/falsch sein
- Approved Templates in Firestore fehlen noch
- Network/CORS Issues

**Fix Applied:**
- ✅ Besseres Error Handling mit detailierter Fehlermeldung
- ✅ Console Logs für Debugging hinzugefügt
- ✅ Fallback auf Default-Template wenn kein Approved Template gefunden

**Wie testen:**
1. Öffne Browser DevTools (F12) → Console Tab
2. Klicke "Generate Email"
3. Schaue in Console welcher Fehler kommt

**Mögliche Fehler:**

| Fehler | Lösung |
|--------|--------|
| `Gemini API Key missing` | `.env.local`: `GEMINI_API_KEY=your-key` hinzufügen |
| `Template not found` | Approved Template in Firestore anlegen (siehe unten) |
| `CORS error` | Gemini API läuft nur serverseitig - API Route bauen |
| `404 models/gemini-1.5-flash` | Model-Name auf `gemini-2.0-flash` ändern |

---

### 2️⃣ "Mark as Completed" aktualisiert Progress nicht

**Ursache:** Step wird in Firestore gespeichert, aber:
- UI lädt nicht neu nach completion
- `onComplete()` callback wurde nicht richtig aufgerufen

**Fix Applied:**
- ✅ Besseres Error Handling
- ✅ Console Logs für Debugging
- ✅ Verwendet `caseData.teamMember` als completedBy

**Wie testen:**
1. Browser DevTools → Console
2. Klicke "Mark as Completed"
3. Schaue in Console ob "✅ Step completed successfully"
4. Workflow sollte neu laden

---

## 🔧 Quick Fixes

### Fix 1: Gemini API als Server Route

Email-Generierung sollte **serverseitig** laufen (nicht im Browser):

**Erstelle:** `app/api/generate-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateEmailDraft } from '@/lib/gemini/emailDrafts';
import { getCase } from '@/lib/firebase/cases';
import { getWorkflow } from '@/lib/firebase/workflows';

export async function POST(request: NextRequest) {
  try {
    const { caseId, stepOrder } = await request.json();
    
    // Load case and workflow
    const caseData = await getCase(caseId);
    const workflow = await getWorkflow(caseId);
    
    if (!caseData || !workflow) {
      return NextResponse.json({ error: 'Case or workflow not found' }, { status: 404 });
    }
    
    const step = workflow.steps.find(s => s.stepOrder === stepOrder);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Generate email
    const emailDraft = await generateEmailDraft(step.stepDefinition, caseData);
    
    return NextResponse.json({ emailDraft });
    
  } catch (error: any) {
    console.error('Error generating email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Update `WorkflowComponents.tsx`:**
```typescript
async function handleGenerateEmail() {
  setGenerating(true);
  try {
    const response = await fetch('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseData.id,
        stepOrder: step.stepOrder,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate email');
    }
    
    setEmailDraft(data.emailDraft);
    await updateEmailDraft(caseData.id, step.stepOrder, data.emailDraft);
    
  } catch (error: any) {
    console.error('Error:', error);
    alert(`Failed: ${error.message}`);
  } finally {
    setGenerating(false);
  }
}
```

---

### Fix 2: Approved Template in Firestore anlegen

**Schnelltest ohne Gemini:**

Erstelle Template in Firestore Console:

```json
{
  "primaryCategory": "marketing_opt_out",
  "requesterType": "customer",
  "templateName": "Marketing Opt-Out Eingangsbestätigung",
  "templateText": "Sehr geehrte Damen und Herren,\n\nwir bestätigen den Eingang Ihrer Opt-Out-Anfrage.\n\nReferenznummer: {{CASE_ID}}\n\nMit freundlichen Grüßen\nHelloFresh Customer Care",
  "keywords": ["email", "acknowledgement", "eingangsbestätigung", "marketing", "opt-out"],
  "whenToUse": "Eingangsbestätigung für Marketing Opt-Out",
  "createdAt": "2026-03-09T20:00:00Z",
  "updatedAt": "2026-03-09T20:00:00Z"
}
```

---

### Fix 3: Fallback auf statisches Template (ohne Gemini)

Wenn Gemini nicht funktioniert, nutze statisches Template:

**Update `lib/gemini/emailDrafts.ts`:**

Füge am Anfang von `generateEmailDraft` hinzu:

```typescript
export async function generateEmailDraft(
  step: ProcessStep,
  caseData: GDPRCase,
  additionalContext?: string
): Promise<string> {
  const emailTemplate = step.emailTemplate;
  
  if (!emailTemplate) {
    throw new Error('Step has no email template defined');
  }

  // 🔥 FALLBACK: If Gemini API not available, use static template
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API Key not found. Using static template.');
    return replaceStaticPlaceholders(emailTemplate.bodyTemplate, caseData);
  }

  // ... rest of code
}

function replaceStaticPlaceholders(template: string, caseData: GDPRCase): string {
  return template
    .replace(/\{\{CASE_ID\}\}/g, caseData.caseId || '[CASE_ID]')
    .replace(/\{\{CUSTOMER_NAME\}\}/g, 'Kunde')
    .replace(/\{\{CUSTOMER_EMAIL\}\}/g, caseData.market || '[EMAIL]')
    .replace(/\{\{RECEIVED_DATE\}\}/g, new Date().toLocaleDateString('de-DE'))
    .replace(/\{\{REASON\}\}/g, '[Grund]');
}
```

---

## 📊 Console Debugging Befehle

**Im Browser Console:**

```javascript
// Check if workflow exists
const workflowRef = await firebase.firestore().collection('workflows').doc('CASE_ID').get();
console.log('Workflow:', workflowRef.data());

// Check current step
const workflow = workflowRef.data();
console.log('Current step:', workflow.steps[workflow.currentStepIndex]);

// Test email generation (mock)
const mockEmail = `Sehr geehrte Damen und Herren,

wir haben Ihre Anfrage erhalten.

Referenznummer: TEST-001

Mit freundlichen Grüßen
HelloFresh`;
console.log('Mock email:', mockEmail);
```

---

## ✅ Testing Checklist

Nach den Fixes:

- [ ] "Generate Email" funktioniert (Console zeigt ✅)
- [ ] Email wird im Editor angezeigt
- [ ] "Mark as Completed" funktioniert
- [ ] Progress Bar aktualisiert sich
- [ ] Nächster Step wird "Current"
- [ ] Completed Step erscheint in History

---

## 🚀 Production-Ready Checklist

Für Production müssen wir noch:

- [ ] **Gemini API** als Server Route (nicht client-side)
- [ ] **Approved Templates** in Firestore mit allen Kategorien
- [ ] **Error Handling** verbessern (Toast notifications)
- [ ] **Loading States** für bessere UX
- [ ] **Optimistic Updates** für schnellere UI
- [ ] **Webhook** für Email-Versand (SendGrid/Postmark)
- [ ] **Audit Log** für alle Workflow-Changes

---

**Nächste Schritte:**

1. **Teste mit Console Logs** - Schaue welcher Fehler genau kommt
2. **API Route bauen** - Wenn Gemini das Problem ist
3. **Firestore Rules** - Nochmal checken ob deployed
4. **Reload testen** - Hard refresh (Cmd+Shift+R)

**Sag mir welchen Fehler du in der Console siehst!** 🐛
