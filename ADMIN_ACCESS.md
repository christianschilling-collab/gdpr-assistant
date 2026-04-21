# Admin Configuration

## Admin Access Control

Admin access is controlled by email addresses. Only users with emails in the `ADMIN_EMAILS` list can:
- Access the `/admin` dashboard
- See the "Admin" link in the navigation
- Access admin-only routes (Templates, Analytics, Reporting, etc.)

### Current Admin Users

The admin email list is defined in two files:

1. **`components/Navigation.tsx`** (lines 9-12)
2. **`app/admin/page.tsx`** (lines 7-10)

```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  // Add more admin emails here
];
```

### Adding New Admin Users

To add a new admin user:

1. Open `components/Navigation.tsx`
2. Add the email address to the `ADMIN_EMAILS` array
3. Open `app/admin/page.tsx`
4. Add the same email address to the `ADMIN_EMAILS` array

**Example:**
```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'jane.doe@hellofresh.com',
  'john.smith@hellofresh.com',
];
```

### Future Improvement

For production, consider:
- Moving `ADMIN_EMAILS` to a shared configuration file
- Storing admin users in Firestore with role-based access control
- Implementing proper Firebase Authentication with custom claims

## Navigation Structure

### Agent View (Default)
- **Cases**: View and manage GDPR cases
- **Training**: Access training content
- **Help**: FAQs and documentation

### Admin View (Admin emails only)
- **Cases**: View and manage GDPR cases
- **Training**: Access training content
- **Help**: FAQs and documentation
- **🔧 Admin**: Access admin dashboard with links to:
  - Templates
  - Analytics
  - Reporting
  - Categories
  - Requester Types
  - Training Content
  - Training Cases Upload
  - Weekly Reports Upload

## Authentication

- Users must sign in with Google (HelloFresh account)
- Authentication state is managed by `AuthContext`
- Sign-in button is only shown on the home page (root `/`)
- Once authenticated, users are redirected to `/cases`
