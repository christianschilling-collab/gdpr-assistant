import { getDb } from './config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { UserRole } from './users';

/**
 * Manually add a new user to Firestore with specified role
 * This should be used by admins to grant access to new users
 */
export async function addNewUser(
  email: string,
  role: UserRole = 'agent',
  displayName?: string
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const now = Timestamp.now();
    
    await setDoc(doc(db, 'users', email), {
      email,
      role,
      displayName: displayName || null,
      createdAt: now,
      isActive: true,
      // lastLoginAt will be set on first login
    });

    console.log(`✅ User created: ${email} (${role})`);
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
}

/**
 * Example usage in Firebase Console or a script:
 * 
 * To add yourself as admin:
 * addNewUser('christian.schilling@hellofresh.de', 'admin', 'Christian Schilling');
 * 
 * To add an agent:
 * addNewUser('agent@hellofresh.com', 'agent', 'Agent Name');
 */
