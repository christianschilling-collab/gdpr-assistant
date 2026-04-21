# GDPR Assistant - Production Security Checklist

**Status:** Development (Shared Project - Open Rules)  
**Target:** Production Deployment (Own Firebase Project)  
**Owner:** Christian Schilling

---

## 📋 Pre-Deployment Checklist

### 🔒 1. Firebase Firestore Security Rules

#### Current State (Development)
```javascript
// ❌ CURRENT: Completely open for development
match /incidents/{incidentId} {
  allow read: if true;
  allow write: if true;
}
```

#### Required for Production
```javascript
// ✅ PRODUCTION: Secure with authentication + roles

// Helper function to check user roles
function hasRole(roles) {
  return request.auth != null 
         && get(/databases/$(database)/documents/users/$(request.auth.token.email)).data.role in roles;
}

function isAuthenticated() {
  return request.auth != null;
}

// Incidents - Critical GDPR Data
match /incidents/{incidentId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && hasRole(['admin', 'agent']);
  allow update: if isAuthenticated() && (
    hasRole(['admin']) || 
    resource.data.createdBy == request.auth.uid
  );
  allow delete: if hasRole(['admin']);
}

// Cases - GDPR Request Data
match /cases/{caseId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && hasRole(['admin', 'agent']);
  allow update: if isAuthenticated() && (
    hasRole(['admin', 'agent']) ||
    resource.data.assignedTo == request.auth.token.email
  );
  allow delete: if hasRole(['admin']);
}

// Escalations
match /escalations/{escalationId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && hasRole(['admin', 'agent']);
  allow update: if isAuthenticated() && hasRole(['admin', 'agent']);
  allow delete: if hasRole(['admin']);
}

// Users - Strict Control
match /users/{userId} {
  allow read: if isAuthenticated();
  allow write: if hasRole(['admin']);  // Only admins can manage users
}

// Templates & Categories - Admin only write
match /templates/{templateId} {
  allow read: if isAuthenticated();
  allow write: if hasRole(['admin']);
}

match /categories/{categoryId} {
  allow read: if isAuthenticated();
  allow write: if hasRole(['admin']);
}

// Weekly Reports
match /weeklyReports/{reportId} {
  allow read: if isAuthenticated();
  allow create: if hasRole(['admin', 'agent']);
  allow update, delete: if hasRole(['admin']);
}

// Audit Logs - Read-only for most, write via backend
match /incidentAuditLog/{logId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();  // Auto-created by system
  allow update, delete: if false;  // Immutable audit trail
}

match /escalationAuditLog/{logId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update, delete: if false;
}

match /caseHistory/{historyId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update, delete: if false;
}
```

---

### 👥 2. User Management

#### Setup Process
- [ ] **Email Whitelist**
  - Only `@hellofresh.com` and `@ext.hellofresh.com` domains
  - Configure in Firebase Auth settings
  
- [ ] **Initial Admin Setup**
  - Create first admin user manually in Firestore
  ```javascript
  {
    email: "your.email@hellofresh.com",
    role: "admin",
    displayName: "Your Name",
    isActive: true,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  }
  ```

- [ ] **User Registration Flow**
  - Remove auto-registration in `AuthContext.tsx`
  - Users must be added by Admin in `/admin/users`
  - Send invitation email to new users

#### User Roles
- **Admin:** Full access, user management, system config
- **Agent:** Create/edit cases, escalations, incidents (assigned to them)
- **Viewer:** Read-only access to cases/reports

---

### 📊 3. Audit Logging

#### What to Log
- [ ] All Case status changes
- [ ] All Incident workflow transitions
- [ ] All Escalation status updates
- [ ] User logins
- [ ] Data exports
- [ ] Template/Configuration changes

#### Log Structure
```typescript
{
  action: "incident_status_change",
  performedBy: "user@hellofresh.com",
  timestamp: Timestamp,
  resourceType: "incident",
  resourceId: "INC-2026-0001",
  changes: {
    field: "status",
    oldValue: "Reporting",
    newValue: "Investigation"
  },
  ipAddress: "...",  // Optional
  userAgent: "..."   // Optional
}
```

---

### 🌐 4. Firebase Project Setup

#### Create New Project
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create new project: `gdpr-assistant-production`
- [ ] Enable Google Analytics (optional)
- [ ] Add web app to project

#### Configuration
- [ ] Copy Firebase config to `.env.production.local`
  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
  NEXT_PUBLIC_FIREBASE_APP_ID=...
  ```

#### Enable Services
- [ ] Authentication → Google Provider
- [ ] Firestore Database → Production mode
- [ ] Cloud Functions (for Next.js SSR)
- [ ] Hosting

#### IAM Permissions Needed
Request from Firebase Admin:
- [ ] `Cloud Functions Admin`
- [ ] `Firebase Hosting Admin`
- [ ] `Firestore Admin`

---

### 🔐 5. Environment Variables

#### Production `.env.production.local`
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gdpr-assistant-production
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_storage
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_production_app_id

# Application
NEXT_PUBLIC_APP_URL=https://gdpr-assistant.hellofresh.com
NODE_ENV=production

# Security
NEXT_PUBLIC_ENABLE_DEBUG_LOGS=false
NEXT_PUBLIC_DEV_MODE=false
```

#### Development `.env.local` (current)
```env
# Keep separate for development on shared project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dach-ai-mvps
# ... existing config
```

---

### 🚀 6. Deployment Checklist

#### Pre-Deployment
- [ ] Remove all `console.log()` statements (or use proper logger)
- [ ] Remove DEV_MODE bypass in `AuthContext.tsx`
- [ ] Test all user roles (admin, agent, viewer)
- [ ] Test Firestore Rules in Firebase Console Rules Playground
- [ ] Run `npm run build` and check for errors
- [ ] Test authentication flow
- [ ] Verify all forms work with validation

#### Deployment Steps
1. [ ] Deploy Firestore Rules: `npx firebase deploy --only firestore:rules`
2. [ ] Deploy Firestore Indexes: `npx firebase deploy --only firestore:indexes`
3. [ ] Deploy Cloud Functions: `npx firebase deploy --only functions`
4. [ ] Deploy Hosting: `npx firebase deploy --only hosting`

#### Post-Deployment
- [ ] Create first admin user in Firestore manually
- [ ] Test login with admin account
- [ ] Create test case/incident/escalation
- [ ] Verify audit logs are working
- [ ] Check Firestore Rules are active (try unauthorized access)
- [ ] Monitor Firebase Console for errors

---

### 📧 7. Email Domain Whitelist

#### Firebase Auth Settings
```javascript
// In Firebase Console → Authentication → Settings → Authorized domains
✅ localhost (for dev)
✅ gdpr-assistant.hellofresh.com (production)
✅ *.firebaseapp.com (Firebase default)
✅ *.web.app (Firebase Hosting)
```

#### Google OAuth Configuration
- [ ] Configure OAuth consent screen
- [ ] Add authorized domains
- [ ] Set app logo and privacy policy link

---

### 🧪 8. Testing Checklist

#### Security Testing
- [ ] Try accessing data without authentication → Should fail
- [ ] Try creating user as non-admin → Should fail
- [ ] Try deleting case as agent → Should fail
- [ ] Try updating incident assigned to someone else → Should fail
- [ ] Verify viewer role has read-only access

#### Functional Testing
- [ ] Create new case
- [ ] Escalate case
- [ ] Create incident
- [ ] Progress through incident workflow
- [ ] Generate weekly report
- [ ] Admin: Create new user
- [ ] Admin: Manage templates

---

### 📝 9. Documentation

#### For LEGAL Team (End Users)
- [ ] User Guide: How to access the app
- [ ] User Guide: How to create a case
- [ ] User Guide: How to handle escalations
- [ ] FAQ Document

#### For IT/Admin
- [ ] Deployment instructions
- [ ] User management process
- [ ] Backup/Restore procedures
- [ ] Monitoring setup

---

### 🔔 10. Monitoring & Alerts

#### Firebase Console
- [ ] Set up error alerts in Cloud Functions
- [ ] Monitor Firestore usage
- [ ] Set budget alerts

#### Application Monitoring
- [ ] Error tracking (Sentry, LogRocket, etc.) - optional
- [ ] Performance monitoring
- [ ] User analytics (Firebase Analytics)

---

## 🎯 Priority Order

1. **P0 - Critical (Must-Have for Launch):**
   - Firestore Security Rules
   - User authentication with email whitelist
   - Remove dev-mode bypass

2. **P1 - High (Should-Have):**
   - Audit logging
   - User role management
   - Basic documentation

3. **P2 - Medium (Nice-to-Have):**
   - Advanced monitoring
   - Detailed analytics
   - Comprehensive documentation

---

## 📞 Contacts

- **Firebase Project Owner:** [TBD - Request from IT]
- **Security Review:** [TBD - Request from InfoSec team if needed]
- **LEGAL Stakeholder:** [Add main contact from LEGAL team]

---

## 📅 Timeline Estimate

- **Firestore Rules:** 2-3 hours
- **User Management Setup:** 1-2 hours
- **Testing:** 2-3 hours
- **Documentation:** 2-3 hours
- **Deployment:** 1 hour

**Total:** ~10-12 hours of focused work

---

**Last Updated:** 2026-03-30  
**Next Review:** Before Production Deployment
