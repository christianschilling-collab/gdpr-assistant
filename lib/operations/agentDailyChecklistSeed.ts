/**
 * Legacy checklist defaults for `agentDailyLogs` — same rows as `lib/constants/dailyQueueDefaults.ts`.
 * Live queue template is loaded from Firestore (`dailyQueueSettings/checklistTemplate`).
 */
import { DEFAULT_CHECKLIST_TEMPLATE_ROWS } from '../constants/dailyQueueDefaults';
import type { AgentDailyChecklistItem } from '../types';

export function buildDefaultChecklistItems(): AgentDailyChecklistItem[] {
  return [...DEFAULT_CHECKLIST_TEMPLATE_ROWS]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      id: r.id,
      label: r.label,
      docUrl: r.docUrl,
      toolUrl: r.toolUrl,
      checked: false,
      checkLog: [],
    }));
}
