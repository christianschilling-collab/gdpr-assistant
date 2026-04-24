/**
 * Fallback admin emails (same list as Navigation) — e.g. Firestore profile not loaded yet,
 * or extra operators who may clear locked daily checklist ticks.
 */
const ADMIN_EMAILS_LOWER = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
].map((e) => e.toLowerCase());

export function isGdprAssistantAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS_LOWER.includes(email.trim().toLowerCase());
}
