# Task Management - Full Configuration Guide

## ✨ New Features

### 1. **Edit Task Button (✏️)**
Every task now has an edit button that opens an inline editor with full configuration options.

### 2. **Editable Fields**
- **Title** (required)
- **Description** (optional)
- **Owner** (email address)
- **Due Date** (date picker)
- **Priority** (High/Medium/Low dropdown)
- **External Links** (multiple links with labels)

### 3. **External Links Management**
- Add multiple external links per task
- Each link has:
  - **Label** (e.g., "Jira Ticket", "Confluence Doc", "Slack Thread")
  - **URL** (clickable link)
- Links displayed as blue badges with 🔗 icon
- Open in new tab with `target="_blank"`

---

## 🎨 UI/UX

### View Mode (Default)
```
┌─────────────────────────────────────────────┐
│ Document root cause analysis         ✏️ ✅  │
│ Collect all relevant information...         │
│ [High] Due: Mar 14 👤 christian             │
│ 🔗 Jira Ticket  🔗 Confluence Doc           │
└─────────────────────────────────────────────┘
```

### Edit Mode (After Clicking ✏️)
```
┌─────────────────────────────────────────────┐
│ Task Title: [________________________]       │
│ Description: [____________________]          │
│              [____________________]          │
│ Owner: [email@hellofresh.com]               │
│ Due Date: [2026-03-14]                      │
│ Priority: [High ▼]                          │
│                                             │
│ External Links:              [+ Add Link]   │
│ [Jira Ticket] [https://jira...] [✕]        │
│ [Confluence ] [https://conf...] [✕]        │
│                                             │
│ [Save Changes] [Cancel]                     │
└─────────────────────────────────────────────┘
```

---

## 📋 Usage Examples

### Example 1: Add Jira Link to Task
1. Click ✏️ on any task
2. Scroll to "External Links"
3. Click "+ Add Link"
4. Label: "Jira Ticket"
5. URL: "https://jira.hellofresh.io/browse/GDPR-123"
6. Click "Save Changes"
7. ✅ Link appears as clickable badge

### Example 2: Change Due Date
1. Click ✏️ on task
2. Change "Due Date" field
3. Click "Save Changes"
4. ✅ Toast: "Task updated successfully"
5. ✅ Audit trail logs: "Updated task: dueDate"

### Example 3: Add Multiple Links
```
🔗 Jira Ticket (https://jira.hellofresh.io/browse/GDPR-123)
🔗 Confluence Doc (https://confluence.hellofresh.io/doc/incident-123)
🔗 Slack Thread (https://hellofresh.slack.com/archives/...)
🔗 GitHub PR (https://github.com/hellofresh/...)
```

---

## 🔍 Audit Trail Examples

### Task Field Updates
```
📜 Audit Trail
├─ Updated task "Document root cause": dueDate
│  task.dueDate: "2026-03-14" → "2026-03-16"
│  by system at Mar 12, 8:30 PM
│
├─ Updated task "Document root cause": priority
│  task.priority: "Medium" → "High"
│  by system at Mar 12, 8:32 PM
│
├─ Updated task "Document root cause": externalLinks
│  task.externalLinks: [] → [{"label":"Jira Ticket","url":"https://..."}]
│  by system at Mar 12, 8:35 PM
│
└─ Updated task "Document root cause": description
   task.description: (empty) → "Need to analyze Salesforce logs..."
   by system at Mar 12, 8:40 PM
```

---

## 🎯 All Configurable Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| **Title** | Text | ✅ Yes | "Document root cause analysis" |
| **Description** | Textarea | ❌ No | "Analyze Salesforce logs and identify configuration error" |
| **Owner** | Email | ✅ Yes | "christian.schilling@hellofresh.de" |
| **Due Date** | Date | ❌ No | "2026-03-14" |
| **Priority** | Dropdown | ✅ Yes | "High" / "Medium" / "Low" |
| **External Links** | Array | ❌ No | `[{label: "Jira", url: "https://..."}]` |

---

## 🚀 User Flow

### Complete Flow for Task Configuration
1. **Navigate to incident detail page**
2. **Find task in "Action Plan" section**
3. **Click ✏️ edit button**
4. **Edit fields:**
   - Update title/description
   - Change owner email
   - Set/update due date
   - Change priority
   - Add external links
5. **Click "Save Changes"**
6. **See:**
   - ✅ Toast notification: "Task updated successfully"
   - Updated task in view mode
   - New entry in audit trail
7. **Click external links** → Opens in new tab

---

## 🔗 External Links Best Practices

### Recommended Link Types
- **Jira Tickets**: Project management tracking
- **Confluence Pages**: Documentation and runbooks
- **Slack Threads**: Team discussions
- **GitHub PRs/Issues**: Code changes
- **Google Docs**: Incident reports
- **Firestore Console**: Database records
- **DataDog/Monitoring**: Technical metrics

### Example Links Configuration
```javascript
externalLinks: [
  { label: "Jira GDPR-123", url: "https://jira.hellofresh.io/browse/GDPR-123" },
  { label: "Incident Report", url: "https://docs.google.com/..." },
  { label: "Slack Discussion", url: "https://hellofresh.slack.com/..." },
  { label: "Root Cause Doc", url: "https://confluence.hellofresh.io/..." }
]
```

---

## 💾 Data Persistence

### Firestore Structure
```javascript
// incidentTasks collection
{
  id: "task123",
  incidentId: "incident456",
  title: "Document root cause",
  description: "Analyze logs...",
  owner: "christian.schilling@hellofresh.de",
  dueDate: Timestamp,
  priority: "High",
  externalLinks: [
    { label: "Jira Ticket", url: "https://..." },
    { label: "Confluence", url: "https://..." }
  ],
  status: "pending",
  createdAt: Timestamp,
  completedAt: null
}
```

### Audit Log Structure
```javascript
// incidentAuditLog collection
{
  id: "log789",
  incidentId: "incident456",
  timestamp: Timestamp,
  changedBy: "system",
  action: "Updated task \"Document root cause\": priority",
  fieldChanged: "task.priority",
  oldValue: "Medium",
  newValue: "High"
}
```

---

## 🎨 Visual Design

### Color Coding
- **High Priority**: Red background (`bg-red-50 border-red-200`)
- **Medium Priority**: Yellow background (`bg-yellow-50 border-yellow-200`)
- **Low Priority**: White background (`bg-white border-gray-200`)
- **Completed**: Gray background (`bg-gray-50`), strikethrough text

### Icons
- ✏️ Edit button (hover: darker)
- ✅ Completed checkmark (green, clickable)
- ○ Pending circle (gray, hover: green)
- 🔗 External link icon (blue badge)
- ✕ Remove link button (red hover)
- 👤 Owner icon (gray)

---

## ✅ Testing Checklist

### Task Edit Flow
- [ ] Click ✏️ on task → Edit mode opens
- [ ] Change title → Save → Title updates
- [ ] Change description → Save → Description updates
- [ ] Change owner → Save → Owner updates
- [ ] Change due date → Save → Due date updates
- [ ] Change priority → Save → Priority badge updates
- [ ] Click Cancel → Form closes, no changes saved

### External Links
- [ ] Click "+ Add Link" → New link fields appear
- [ ] Fill label + URL → Save → Link appears as badge
- [ ] Click link badge → Opens in new tab
- [ ] Add multiple links → All appear
- [ ] Click ✕ on link → Link removed
- [ ] Save task with links → Links persist

### Audit Trail
- [ ] Edit task → Check audit trail → See change logged
- [ ] Change multiple fields → All changes logged separately
- [ ] Audit shows old → new values
- [ ] Audit shows field name in friendly format

---

## 🚦 Feature Status

✅ **Implemented:**
- Task editing (all fields)
- External links (add/remove/edit)
- Complete audit trail
- Toast notifications
- Field validation
- UI/UX polish

🎯 **Ready to Test:**
All features are production-ready and can be tested now!
