import { getAllUsers, type UserProfile } from '@/lib/firebase/users';

export const BOARD_UNASSIGNED = 'Unassigned';

export type AssigneeEmailDirectory = {
  /** Maps any stored assignee string to canonical work email, or `BOARD_UNASSIGNED`. */
  toEmail(raw: string | undefined | null): string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Build lookup from Firestore `users` profiles so board + filters use one email per person.
 * Keys: email (lower), display name (lower), each name token, email local-part before @.
 * First registration wins for ambiguous tokens (e.g. two "Alex").
 */
export function buildAssigneeDirectory(users: UserProfile[]): AssigneeEmailDirectory {
  const emailLowerToCanonical = new Map<string, string>();
  const nameKeyToEmail = new Map<string, string>();

  const registerNameKey = (key: string, email: string) => {
    const k = norm(key);
    if (!k) return;
    if (!nameKeyToEmail.has(k)) nameKeyToEmail.set(k, email);
  };

  for (const u of users) {
    if (u.isActive === false) continue;
    const email = (u.email || u.id || '').trim();
    if (!email || !email.includes('@')) continue;

    const canon = email;
    emailLowerToCanonical.set(norm(email), canon);

    const dn = (u.displayName || '').trim();
    if (dn) {
      registerNameKey(dn, canon);
      for (const part of dn.split(/\s+/)) {
        registerNameKey(part, canon);
      }
    }

    const local = email.split('@')[0];
    if (local) registerNameKey(local, canon);

    for (const a of u.assigneeAliases ?? []) {
      registerNameKey(a, canon);
    }
  }

  return {
    toEmail(raw: string | undefined | null): string {
      const t = (raw || '').trim();
      if (!t || /^unassigned$/i.test(t)) return BOARD_UNASSIGNED;
      if (t.includes('@')) {
        const hit = emailLowerToCanonical.get(norm(t));
        return hit ?? norm(t);
      }
      const key = norm(t);
      const byFull = nameKeyToEmail.get(key);
      if (byFull) return byFull;
      const first = key.split(/\s+/)[0] || '';
      const byFirst = nameKeyToEmail.get(first);
      if (byFirst) return byFirst;
      return BOARD_UNASSIGNED;
    },
  };
}

/** When user list cannot be loaded (e.g. offline): only normalise real email strings. */
export function emptyAssigneeDirectory(): AssigneeEmailDirectory {
  return {
    toEmail(raw: string | undefined | null): string {
      const t = (raw || '').trim();
      if (!t || /^unassigned$/i.test(t)) return BOARD_UNASSIGNED;
      if (t.includes('@')) return norm(t);
      return BOARD_UNASSIGNED;
    },
  };
}

/**
 * Resolve assignee input to a stored value: always a lowercase email when recognized,
 * otherwise `BOARD_UNASSIGNED` (no nicknames persisted).
 */
export async function resolveAssigneeInputToStoredEmail(raw: string): Promise<string> {
  const t = (raw || '').trim();
  if (!t || /^unassigned$/i.test(t)) return BOARD_UNASSIGNED;
  try {
    const users = await getAllUsers();
    const dir = users.length > 0 ? buildAssigneeDirectory(users) : emptyAssigneeDirectory();
    return dir.toEmail(t);
  } catch {
    return emptyAssigneeDirectory().toEmail(t);
  }
}
