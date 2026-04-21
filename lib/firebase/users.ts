import { getDb } from './config';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where, limit, Timestamp } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export type UserRole = 'admin' | 'agent';

export interface UserProfile {
  id: string; // Email as ID
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

// Get user profile by email
export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const docRef = doc(db, USERS_COLLECTION, email);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      role: data.role || 'agent',
      displayName: data.displayName,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
      lastLoginAt: data.lastLoginAt?.toDate(),
      isActive: data.isActive !== false, // Default to true
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

// Create or update user profile on login
export async function createOrUpdateUserProfile(
  email: string,
  displayName?: string
): Promise<UserProfile> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const docRef = doc(db, USERS_COLLECTION, email);
    const docSnap = await getDoc(docRef);

    const now = Timestamp.now();

    if (docSnap.exists()) {
      // Update existing user
      await updateDoc(docRef, {
        lastLoginAt: now,
        updatedAt: now,
        ...(displayName && { displayName }),
      });

      return getUserProfile(email) as Promise<UserProfile>;
    } else {
      // Create new user with default 'agent' role
      const newUser: Omit<UserProfile, 'id'> = {
        email,
        role: 'agent',
        displayName,
        createdAt: now.toDate(),
        lastLoginAt: now.toDate(),
        isActive: true,
      };

      await setDoc(docRef, {
        email: newUser.email,
        role: newUser.role,
        displayName: newUser.displayName || null,
        createdAt: now,
        lastLoginAt: now,
        isActive: newUser.isActive,
      });

      return getUserProfile(email) as Promise<UserProfile>;
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
}

// Update user role (admin only)
export async function updateUserRole(email: string, role: UserRole): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const docRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(docRef, {
      role,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const q = query(collection(db, USERS_COLLECTION), limit(500));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        role: data.role || 'agent',
        displayName: data.displayName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
        isActive: data.isActive !== false,
      };
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

// Check if user is admin
export async function isUserAdmin(email: string): Promise<boolean> {
  const profile = await getUserProfile(email);
  return profile?.role === 'admin' && profile.isActive;
}

// Deactivate user (admin only)
export async function deactivateUser(email: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const docRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
}

// Activate user (admin only)
export async function activateUser(email: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');

  try {
    const docRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(docRef, {
      isActive: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error activating user:', error);
    throw error;
  }
}
