# GDPR Incident Assistant - UI/UX Mockups & Wireframes

**Design System:** Tailwind CSS + GDPR Assistant Theme  
**Target User:** Compliance Team, Legal, Customer Care Management  
**Primary Goal:** Fast incident documentation with automated compliance checks

---

## 1. NAVIGATION INTEGRATION

```
┌─────────────────────────────────────────────────────────────────┐
│  GDPR Assistant                                    👤 Christian   │
├─────────────────────────────────────────────────────────────────┤
│  🏠 Home  │  📋 Cases  │  🚨 Incidents (NEW)  │  ⚙️ Admin       │
└─────────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- New "Incidents" tab with alert emoji (🚨) for visibility
- Badge with count of "Open" incidents
- Red notification dot if any incident >48h old (Art. 33 deadline!)

---

## 2. INCIDENTS DASHBOARD (/incidents)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚨 Incident Management                    [+ New Incident]          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Filters:  [All ▾] [Status ▾] [Risk Level ▾] [Country ▾]   🔍       │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ID          │ Nature       │ Status        │ Risk  │ Days   │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ INC-2024-01 │ Data Loss    │ 🔴 Reporting  │ High  │ 12h    │   │
│  │ INC-2024-02 │ Unauthorized │ 🟡 Investigation│ Med │ 3d     │   │
│  │ INC-2024-03 │ System Down  │ 🟢 Remediation│ Low   │ 7d     │   │
│  │ INC-2024-04 │ Email Leak   │ ✅ Closed     │ High  │ 15d    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Stats: 🔴 1 Active  │ 🕐 2 within 72h  │ ✅ 15 Closed (30d)        │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Color-coded status badges**
- **"Days" column** shows time since discovery (RED if >48h)
- **Quick stats banner** at bottom
- **Click row** → Opens detail view

**Risk Level Colors:**
- 🔴 High: Red (bg-red-100, text-red-800)
- 🟡 Medium: Yellow (bg-yellow-100, text-yellow-800)
- 🟢 Low: Green (bg-green-100, text-green-800)

---

## 3. NEW INCIDENT FORM (/incidents/new)

### **STEP-BY-STEP WIZARD DESIGN**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Create New Incident                                      [Cancel]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Progress:  ●━━━━━━○━━━━━━○━━━━━━○━━━━━━○                          │
│            Step 1  Step 2  Step 3  Step 4  Step 5                   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📝 SECTION 1: EXECUTIVE SUMMARY                            │   │
│  │                                                              │   │
│  │  Nature of Incident *                                       │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ Brief description (max 200 chars)                    │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  Affected Systems * (Multi-Select)                          │   │
│  │  ☐ CRM         ☐ Payment System    ☐ Email Platform        │   │
│  │  ☐ Website     ☐ Mobile App        ☐ Internal Tools        │   │
│  │                                                              │   │
│  │  Discovery Date *         Impact Period *                   │   │
│  │  [📅 2024-03-09]         [From] [📅] → [To] [📅]          │   │
│  │                                                              │   │
│  │  Root Cause (Visible only in Investigation status)          │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ [Hidden until status = Investigation]                │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│                              [Next: Impact Analysis →]                │
└─────────────────────────────────────────────────────────────────────┘
```

**Form Logic:**
- **Required fields** marked with *
- **Conditional fields** show based on workflow status
- **Auto-save** every 30 seconds
- **Validation** inline with red borders

---

## 4. IMPACT ANALYSIS SECTION

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 SECTION 2: IMPACT ANALYSIS                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Primary Legal Risk *                                                │
│  ○ Loss of Availability  ○ Loss of Confidentiality  ○ Loss of Integrity │
│                                                                       │
│  Classification *                                                     │
│  [Select risk type ▾]                                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Country-Specific Impact                                     │   │
│  │                                                              │   │
│  │  ┌───────┬─────────────┬────────────────┬──────────────┐   │   │
│  │  │Country│ Impacted Vol│ Complaints Rec │ Risk Level   │   │   │
│  │  ├───────┼─────────────┼────────────────┼──────────────┤   │   │
│  │  │ 🇧🇪 BE │ [1,250    ]│ [5           ]│ 🔴 High     │   │   │
│  │  │ 🇱🇺 LU │ [   120   ]│ [0           ]│ 🟡 Medium   │   │   │
│  │  │ 🇳🇱 NL │ [ 3,400   ]│ [12          ]│ 🔴 High     │   │   │
│  │  │ 🇫🇷 FR │ [ 2,100   ]│ [8           ]│ 🔴 High     │   │   │
│  │  └───────┴─────────────┴────────────────┴──────────────┘   │   │
│  │                                                              │   │
│  │  Total Impacted: 6,870 customers                            │   │
│  │  ⚠️ High risk: Notification to authority recommended         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  [← Back]                           [Next: Remediation Actions →]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Smart Features:**
- **Auto-calculate risk level** based on volume (>1000 = High)
- **Flag icon** appears if complaints > 10
- **Sum total** updates in real-time
- **Warning banner** if Art. 33 notification needed

---

## 5. NOTIFICATION ASSESSMENT (Legal Review)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚖️ SECTION 4: NOTIFICATION ASSESSMENT                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  🕐 Time since discovery: 18 hours (54 hours remaining)             │
│                                                                       │
│  Risk Assessment *                                                   │
│  ○ High Risk (Likely to result in high risk to rights)              │
│  ○ Medium Risk (Some risk but mitigated)                            │
│  ○ Low Risk (No risk to individuals' rights)                        │
│                                                                       │
│  Legal Reasoning *                                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Based on GDPR Art. 33...                                     │  │
│  │                                                               │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Decision *                                                          │
│  ○ Notify Data Protection Authority (within 72h)                    │
│  ○ No notification required (document reasoning)                    │
│                                                                       │
│  Validated By *        Date/Time                                    │
│  [Tiphaine RT-G  ▾]    [2024-03-09 14:30]                          │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ Auto-Actions on Status Change to "Remediation":          │    │
│  │  → Create task: "Fill incident log" (C. Schilling)          │    │
│  │  → Create task: "Register in local register" (T. RT-G)      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  [← Back]                              [Save & Close Incident]       │
└─────────────────────────────────────────────────────────────────────┘
```

**Legal Compliance Features:**
- **72h countdown timer** (RED when <24h remaining)
- **Auto-notification** when decision = "Notify Authority"
- **Task preview** shows what will be auto-created

---

## 6. INCIDENT DETAIL VIEW (/incidents/[id])

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚨 Incident INC-2024-01                [Edit] [Export PDF] [Close] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Status Workflow:                                                    │
│  ●━━━━━●━━━━━●━━━━━●━━━━━○                                        │
│  Report Invest Legal  Remed Closed                                  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📋 Executive Summary                                        │   │
│  │  Nature: Customer data exposed via API error                │   │
│  │  Systems: Payment System, CRM                               │   │
│  │  Discovery: 2024-03-07 09:15                                │   │
│  │  Root Cause: Misconfigured API endpoint permissions         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📊 Impact Analysis                                          │   │
│  │  Total Affected: 6,870 customers (BE, LU, NL, FR)          │   │
│  │  Risk: 🔴 High (Confidentiality breach)                     │   │
│  │  [View detailed breakdown →]                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ✅ Action Items (Auto-generated)                            │   │
│  │  □ Fill incident log and escalate (C. Schilling) Due: Today │   │
│  │  □ Register in BNL/FR register (T. RT-G)      Due: +2d      │   │
│  │  ☑ Notify DPA Belgium (Completed: 2024-03-08)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📜 Audit Trail                                              │   │
│  │  • 2024-03-09 14:30 - Status → Remediation (T. RT-G)       │   │
│  │  • 2024-03-08 11:20 - Risk Level → High (C. Schilling)     │   │
│  │  • 2024-03-07 09:30 - Created (System)                      │   │
│  │  [Show all 12 changes →]                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Interactive Elements:**
- **Status dots** clickable to change status
- **Action items** checkable inline
- **Audit trail** expandable
- **Export PDF** matches official GDPR template format

---

## 7. ADMIN PANEL INTEGRATION

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚙️ Admin > Incident Settings                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Notification Rules                                          │   │
│  │  ✓ Auto-notify if risk = High                               │   │
│  │  ✓ Alert at 48h mark (72h - 24h buffer)                     │   │
│  │  ✓ Weekly digest to: legal@hellofresh.com                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Task Templates                                              │   │
│  │  Status: Remediation → [Edit Tasks]                         │   │
│  │  Status: Closed → [Edit Tasks]                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Country Settings                                            │   │
│  │  🇧🇪 Belgium: DPA Email, Register Link                       │   │
│  │  🇱🇺 Luxembourg: DPA Email, Register Link                    │   │
│  │  🇳🇱 Netherlands: DPA Email, Register Link                   │   │
│  │  🇫🇷 France: CNIL Email, Register Link                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. MOBILE RESPONSIVE DESIGN

```
┌────────────────────┐
│ 🚨 Incidents   [+] │
├────────────────────┤
│ [All ▾] [🔍]      │
│                    │
│ ┌────────────────┐ │
│ │ INC-2024-01   │ │
│ │ Data Loss     │ │
│ │ 🔴 Reporting  │ │
│ │ 12h ago       │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │ INC-2024-02   │ │
│ │ Unauthorized  │ │
│ │ 🟡 Investigation│ │
│ │ 3d ago        │ │
│ └────────────────┘ │
│                    │
│ Stats:            │
│ 🔴 1  🕐 2  ✅ 15 │
└────────────────────┘
```

**Mobile-First Features:**
- Swipe to mark complete
- Bottom navigation tabs
- Condensed card view
- Quick filters at top

---

## DESIGN TOKENS (Tailwind Config)

```javascript
// Incident-specific colors
module.exports = {
  theme: {
    extend: {
      colors: {
        incident: {
          high: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
          medium: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
          low: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
        },
        status: {
          reporting: { bg: 'bg-red-100', text: 'text-red-700' },
          investigation: { bg: 'bg-blue-100', text: 'text-blue-700' },
          legal: { bg: 'bg-purple-100', text: 'text-purple-700' },
          remediation: { bg: 'bg-orange-100', text: 'text-orange-700' },
          closed: { bg: 'bg-gray-100', text: 'text-gray-700' },
        }
      }
    }
  }
}
```

---

## KEY UX DECISIONS

✅ **Do's:**
- Clear visual hierarchy (color-coded statuses)
- Contextual help text at each step
- Inline validation with helpful error messages
- Auto-save progress (no data loss)
- Smart defaults based on previous incidents

❌ **Don'ts:**
- Don't overwhelm with all sections at once (wizard approach)
- Don't make Country table editable in "Reporting" status
- Don't allow status change without validation
- Never hide the 72h countdown (compliance critical!)

---

**Möchtest du eine bestimmte Seite als interaktiven Prototypen sehen, oder sollen wir mit der Implementation beginnen?** 🚀
