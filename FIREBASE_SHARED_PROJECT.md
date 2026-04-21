# 🔥 Firebase Configuration - Shared Project

> **Update (2026):** The GDPR Assistant targets Firebase project **`team-cc-gdpr`** together with the AI Enablement dashboard. The old shared pilot **`dach-ai-mvps`** is no longer the deployment target. See **`MIGRATION_FIREBASE_TEAM_CC_GDPR.md`** in this repo for the current checklist.

## ⚠️ WICHTIG: Geteiltes Firebase-Projekt (Historie — dach-ai-mvps)

Dieses Projekt nutzt ein **geteiltes Firebase-Projekt** mit 7 anderen Apps von 6 verschiedenen Projektleitern.

**Das bedeutet:**
- ❌ Firestore Rules NICHT einfach überschreiben
- ❌ Keine Breaking Changes für andere Teams
- ✅ Nur chirurgisch präzise Änderungen
- ✅ Koordination mit anderen Teams nötig

---

## 🏠 LOKALE ENTWICKLUNG

### **Aktueller Workaround: Email-basierte Authentifizierung**

Für lokale Entwicklung nutzen wir einen **Email-Fallback**, der KEINE Firestore Rules benötigt:

**Admin-Emails sind hardcoded in:**
1. `components/Navigation.tsx` (Zeile ~10-15)
2. `components/AuthGuard.tsx` (Zeile ~16-20)
3. `app/admin/page.tsx` (Zeile ~10-15)
4. `app/admin/users/page.tsx` (Zeile ~10-15)

```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
];
```

**Weitere Admins hinzufügen:**
1. Email in allen 4 Dateien zur `ADMIN_EMAILS` Liste hinzufügen
2. Sign In mit Google
3. Sofortiger Admin-Zugriff

---

## 🚀 PRODUCTION DEPLOYMENT

### **Wenn die App auf Firebase Hosting deployed wird:**

Dann müssen wir diese Firestore Rules **präzise hinzufügen**:

```javascript
// NUR diese Regel zur bestehenden rules_version = '2' Datei hinzufügen:

// GDPR Assistant - User Management
match /users/{userId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && 
    request.auth.token.email in [
      'christian.schilling@hellofresh.de',
      // Weitere Admin-Emails hier
    ];
  allow update, delete: if request.auth != null && 
    (request.auth.token.email == userId || 
     get(/databases/$(database)/documents/users/$(request.auth.token.email)).data.role == 'admin');
}

// GDPR Assistant Collections (alle benötigen diese Regel)
match /cases/{caseId} {
  allow read, write: if request.auth != null;
}

match /templates/{templateId} {
  allow read, write: if request.auth != null;
}

match /categories/{categoryId} {
  allow read, write: if request.auth != null;
}

match /requesterTypes/{typeId} {
  allow read, write: if request.auth != null;
}

match /trainingCategories/{categoryId} {
  allow read, write: if request.auth != null;
}

match /weeklyReports/{reportId} {
  allow read, write: if request.auth != null;
}

match /activityLog/{logId} {
  allow read, write: if request.auth != null;
}

match /trainingCases/{caseId} {
  allow read, write: if request.auth != null;
}
```

---

## 📋 COLLECTIONS DIE WIR NUTZEN

Diese Collections werden von der GDPR Assistant App genutzt:

**Kern-Collections:**
- `users` - User Profile & Roles ⚠️ **NEU**
- `cases` - GDPR Cases
- `templates` - Response Templates
- `categories` - GDPR Categories
- `requesterTypes` - Requester Types

**Training & Reporting:**
- `trainingCategories` - Training Content
- `trainingCases` - Agent Error Tracking ⚠️ **NEU**
- `weeklyReports` - Weekly Market Reports ⚠️ **NEU**
- `activityLog` - Auto-generated Activity Log ⚠️ **NEU**

**Optional (future):**
- `templateVersions` - Template History
- `caseHistory` - Case Status Changes
- `agentProgress` - Training Progress
- `agentTraining` - Training Assignments

---

## ⚠️ VOR PRODUCTION DEPLOYMENT

### **Checklist:**

- [ ] Mit anderen Projektleitern abstimmen
- [ ] Firestore Rules präzise hinzufügen (nur GDPR Assistant Collections)
- [ ] Testen in Staging-Environment
- [ ] Keine Breaking Changes für andere Apps verifizieren
- [ ] Deployment dokumentieren

---

## 🛠️ AKTUELLER STATUS

**✅ Funktioniert lokal:**
- Email-basierte Admin-Authentifizierung
- Alle Features verfügbar
- Keine Firestore Rules nötig

**⏳ Für Production benötigt:**
- Firestore Rules für `users` Collection
- Firestore Rules für GDPR Assistant Collections
- Koordination mit anderen Teams

---

## 📝 NOTIZEN

- Firestore Rules Änderungen erst bei Production Deployment
- Lokale Entwicklung funktioniert mit Email-Fallback
- Admin-Emails in Code hardcoded (für jetzt okay)
- Später: Migration zu Firestore-basierten Rollen
