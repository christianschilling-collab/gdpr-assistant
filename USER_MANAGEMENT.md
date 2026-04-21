# 🔐 User Management & Access Control

## Overview

The GDPR Assistant now has a complete user management system with role-based access control. All access is controlled through Google Sign-In and managed through Firestore.

---

## 🎯 User Roles

### **Agent** (Default)
- Access to: Cases, Training, Help
- Cannot access: Templates, Analytics, Reporting, Admin areas

### **Admin**
- Full access to all features
- Can manage user roles
- Access to: Cases, Training, Help, **+ Templates, Analytics, Reporting, Admin Dashboard**

---

## 🚀 Setup Instructions

### 1. **Deploy Firestore Rules**

The `users` collection rules have been added to `firestore-rules-development.txt`. Deploy them:

```bash
# In Firebase Console:
# 1. Go to Firestore Database → Rules
# 2. Copy content from firestore-rules-development.txt
# 3. Publish
```

### 2. **Set Yourself as Admin**

**First Login:**
1. Sign in with Google at `http://localhost:3000/`
2. This creates your user profile with role `agent` (default)

**Promote to Admin (Option A - Firebase Console):**
1. Go to Firebase Console → Firestore Database
2. Navigate to `users` collection
3. Find your document (email as ID, e.g., `christian.schilling@hellofresh.de`)
4. Edit the document:
   - Change `role` from `"agent"` to `"admin"`
   - Save

**Promote to Admin (Option B - User Management Page):**
1. Temporarily grant yourself admin access in code:
   - Edit `components/Navigation.tsx` and `app/admin/page.tsx`
   - Change line with `getUserProfile` to return `{ role: 'admin' }` temporarily
2. Navigate to `/admin/users`
3. Change your role to Admin
4. Revert code changes

---

## 👥 User Management

### **Access User Management:**
`http://localhost:3000/admin/users`

### **Features:**
- ✅ View all users
- ✅ Change user roles (Admin/Agent)
- ✅ Activate/Deactivate users
- ✅ See last login times
- ✅ User statistics

### **Managing Users:**

**Change Role:**
- Select "Admin" or "Agent" from dropdown
- Changes take effect immediately
- User will need to reload page to see new permissions

**Deactivate User:**
- Click "Deactivate" button
- User cannot access any pages except home
- Can be reactivated later

---

## 🔒 Access Control

### **Authentication Flow:**

1. **Home Page (`/`)**: Public, shows login button
2. **User signs in with Google**
3. **User profile created/updated in Firestore**
   - New users: `role: "agent"`, `isActive: true`
   - Existing users: `lastLoginAt` updated
4. **AuthGuard checks access for all routes**
5. **User redirected based on role:**
   - Not authenticated → Home
   - Agent trying to access Admin route → Cases
   - Admin → Full access

### **Protected Routes:**

**Public (No Auth Required):**
- `/` (Home)
- `/reporting/view` (Public reporting view)

**Agent Access:**
- `/cases`
- `/cases/[id]`
- `/cases/new`
- `/training`
- `/help`

**Admin Only:**
- `/admin/*`
- `/templates`
- `/analytics`
- `/reporting`

---

## 🛠️ Technical Details

### **Files:**

**User Management:**
- `lib/firebase/users.ts`: Firestore operations for user profiles
- `app/admin/users/page.tsx`: User management UI

**Authentication:**
- `lib/contexts/AuthContext.tsx`: Extended with user profile and role
- `components/AuthGuard.tsx`: Route protection
- `components/Navigation.tsx`: Role-based navigation

**Firestore:**
- Collection: `users`
- Document ID: User email
- Fields:
  ```typescript
  {
    email: string;
    role: 'admin' | 'agent';
    displayName?: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    lastLoginAt?: Timestamp;
    isActive: boolean;
  }
  ```

### **Context API:**

```typescript
const { 
  user,          // Firebase User object
  userProfile,   // Firestore user profile
  userRole,      // 'admin' | 'agent' | null
  isAdmin,       // boolean
  loading,       // boolean
  isAuthenticated, // boolean
  refreshUserProfile, // function
} = useAuth();
```

---

## 🔧 Common Tasks

### **Add a New Admin:**
1. User signs in (creates profile with `agent` role)
2. Go to `/admin/users`
3. Find user in list
4. Change role to "Admin"

### **Remove Admin Access:**
1. Go to `/admin/users`
2. Find user in list
3. Change role to "Agent"

### **Temporarily Disable User:**
1. Go to `/admin/users`
2. Click "Deactivate"
3. User can no longer access the app (except home)

### **Check Who Has Admin Access:**
1. Go to `/admin/users`
2. See "Admins" stat at bottom
3. Admins are highlighted with orange badges

---

## 📋 Migration Notes

### **Old System:**
- Hard-coded email list in `Navigation.tsx` and `app/admin/page.tsx`
- No user profiles
- No deactivation feature

### **New System:**
- Database-driven roles
- User profiles stored in Firestore
- Centralized user management
- Deactivation/activation support
- Last login tracking

### **Removed:**
- `ADMIN_EMAILS` constant (replaced with Firestore roles)
- Session-based admin check (replaced with Firestore user profile)

---

## ⚠️ Important Notes

1. **First admin must be created manually** in Firestore Console
2. **All new users default to "agent" role**
3. **Inactive users cannot access any protected routes**
4. **Role changes require page reload** to take effect
5. **Deploy Firestore rules** before testing

---

## 🧪 Testing

1. **Sign out and sign in again**
2. **Check that user profile is created in Firestore**
3. **Verify navigation shows only allowed links**
4. **Try accessing admin routes as agent** (should redirect to `/cases`)
5. **Promote to admin and verify access**
6. **Test deactivation** (user should only see home page)

---

## 🚀 Next Steps

1. Deploy Firestore rules
2. Sign in and promote yourself to admin
3. Invite team members
4. Assign roles via `/admin/users`
5. Done! 🎉
