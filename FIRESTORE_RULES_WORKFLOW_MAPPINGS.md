# 🔥 Firestore Rules Update Required

## ⚠️ Action Required

You need to manually update your Firestore Rules to add permissions for the new `workflowMappings` collection.

---

## 📝 Instructions

### Step 1: Open Firebase Console

1. Go to: https://console.firebase.google.com/
2. Select your project: **GDPR Assistant**
3. Navigate to: **Firestore Database** (left sidebar)
4. Click: **Rules** (top tab)

### Step 2: Add New Rules

Find the section that says:

```javascript
// ============================================
// MULTI-STEP WORKFLOWS (NEW)
// ============================================
// Workflows collection - Multi-step workflow instances per case
match /workflows/{workflowId} {
  allow read, write: if true;
}
```

**Replace it with:**

```javascript
// ============================================
// MULTI-STEP WORKFLOWS (NEW)
// ============================================
// Workflows collection - Multi-step workflow instances per case
match /workflows/{workflowId} {
  allow read, write: if true;
}

// Workflow Mappings collection - Maps Case Type + Requester Type -> Workflow Template
match /workflowMappings/{mappingId} {
  allow read: if true;
  allow write: if true; // TODO: Restrict to admins in production
}
```

### Step 3: Publish Rules

1. Click **"Publish"** button (top right)
2. Wait for confirmation: "Rules published successfully"

---

## ✅ Verification

Test that rules are working:

1. Reload your app: `http://localhost:3000/admin/workflows`
2. Click **"Save Mappings"**
3. Check for success message (no Firebase permission errors)

---

## 🛠️ Alternative: Use Firebase CLI (If Installed)

If you have Firebase CLI installed, you can deploy the updated rules file:

```bash
firebase deploy --only firestore:rules
```

**Note:** The rules file has already been updated in your project at:
`/Users/christian.schilling/gdpr-assistant-cursor/firestore.rules`

---

## 📚 What This Does

The new rule allows:
- **Read Access**: Anyone can read workflow mappings (needed for case creation)
- **Write Access**: Anyone can write (TODO: Restrict to admins in production)

For production, you should restrict write access to admins only:

```javascript
match /workflowMappings/{mappingId} {
  allow read: if true;
  allow write: if request.auth != null 
               && request.auth.token.email.matches('.*@hellofresh\\.com$');
}
```

---

## ❓ Need Help?

If you encounter any issues:
1. Check browser console for Firebase errors
2. Verify rules are published (check Firebase Console → Rules → Published tab)
3. Try refreshing the page after publishing rules

**Once rules are updated, the workflow management feature will work! 🎉**
