# 🔥 Adding GDPR Assistant Rules to Existing Firestore Rules

## Current Rules
Your Firestore rules currently handle:
- `/quizzes/{quizId}` - Quiz collection
- `/games/{gameId}` - Game sessions

## What We Need to Add
We need to add rules for:
- `/cases/{caseId}` - GDPR cases collection
- `/templates/{templateId}` - Response templates collection

## Updated Rules (Add to Your Existing Rules)

Replace your current rules with this (adds GDPR Assistant rules without changing quiz/game rules):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // GDPR Assistant Collections
    // ============================================
    
    // Cases collection - GDPR case management
    match /cases/{caseId} {
      // Allow read access to all (for GDPR assistant UI)
      allow read: if true;
      
      // Allow create/update/delete for authenticated users
      // (You can restrict this later if needed)
      allow create, update, delete: if request.auth != null;
    }
    
    // Templates collection - Response templates
    match /templates/{templateId} {
      // Allow read access to all (templates are reference data)
      allow read: if true;
      
      // Allow create/update/delete for authenticated users
      allow create, update, delete: if request.auth != null;
    }
    
    // ============================================
    // Existing Quiz/Game Rules (Unchanged)
    // ============================================
    
    // Quiz collection - privacy-based access control
    match /quizzes/{quizId} {
      // Anyone can read a single quiz (needed for gameplay - players aren't authenticated)
      allow get: if true;
      
      // Authenticated users can list/query quizzes
      // The query will only return documents that match these conditions
      allow list: if request.auth != null 
                  && (resource.data.createdBy == request.auth.uid 
                      || resource.data.privacy == 'public');
      
      // Create: Authenticated users only, must set createdBy to their uid
      allow create: if request.auth != null 
                    && request.resource.data.createdBy == request.auth.uid
                    && request.resource.data.privacy in ['public', 'private'];
      
      // Update: Creator can always update, others can update public quizzes
      allow update: if request.auth != null && (
        resource.data.createdBy == request.auth.uid ||
        (resource.data.privacy == 'public' && request.resource.data.privacy == 'public')
      );
      
      // Delete: Only the creator can delete
      allow delete: if request.auth != null 
                    && resource.data.createdBy == request.auth.uid;
    }
    
    // Game sessions - anyone can read/write for real-time gameplay
    match /games/{gameId} {
      // Allow read access to all (players need to see game state)
      allow read: if true;
      
      // Only authenticated hosts can create games
      allow create: if request.auth != null;
      
      // Allow updates for game progression and player joins
      allow update: if true;
      
      // Only the host can delete games
      allow delete: if request.auth != null;
    }
  }
}
```

## Alternative: Open Access for Development

If you want to test without authentication first, you can use this simpler version for cases/templates:

```javascript
    // Cases collection - GDPR case management (Development mode)
    match /cases/{caseId} {
      allow read, write: if true;
    }
    
    // Templates collection - Response templates (Development mode)
    match /templates/{templateId} {
      allow read, write: if true;
    }
```

**⚠️ Note**: The open access version is for development only. Switch to authenticated access for production.

## Steps to Apply

1. **Go to Firestore Rules**:
   - https://console.firebase.google.com/project/dach-ai-mvps/firestore/rules

2. **Copy the full rules above** (with GDPR Assistant sections added)

3. **Paste into the rules editor**

4. **Click "Publish"**

5. **Test your GDPR Assistant** - it should work now!

## What Changed

✅ **Added**: Rules for `/cases` and `/templates` collections  
✅ **Unchanged**: All existing quiz/game rules remain exactly the same  
✅ **Safe**: No impact on existing quiz/game functionality
