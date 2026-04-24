/**
 * Default "Daily queue" UI when Firestore `dailyQueueSettings` has no document yet.
 * Admins can replace this via Admin → Daily queue config.
 */
import type { DailyChecklistTemplateRow, DailyNextActionConfig } from '../types';

const CONFLUENCE_HUB =
  'https://hellofresh.atlassian.net/wiki/spaces/CCDACH/pages/4692772632/GDPR+Team+Hub';
const CONFLUENCE_DAILY_QUEUE =
  'https://hellofresh.atlassian.net/wiki/spaces/CCDACH/pages/5893488642/Daily+Queue+Processing+Checklist';

export const DEFAULT_DAILY_NEXT_ACTIONS: DailyNextActionConfig[] = [
  {
    id: 'new-case',
    title: 'New case',
    description: 'Create a GDPR case in the assistant.',
    href: '/cases/new',
    sortOrder: 10,
  },
  {
    id: 'critical-escalation',
    title: 'Critical escalation',
    description: 'Report a critical GDPR escalation.',
    href: '/escalations/new',
    sortOrder: 20,
  },
  {
    id: 'new-incident',
    title: 'New incident',
    description: 'Log a data breach / Art. 33 incident.',
    href: '/incidents/new',
    sortOrder: 30,
  },
  {
    id: 'confluence-daily-queue',
    title: 'Daily queue checklist (Confluence)',
    description: 'SOP steps 1–10 (Confluence daily queue checklist).',
    href: CONFLUENCE_DAILY_QUEUE,
    external: true,
    sortOrder: 40,
  },
  {
    id: 'team-hub',
    title: 'GDPR Team Hub',
    description: 'Team documentation and links.',
    href: CONFLUENCE_HUB,
    external: true,
    sortOrder: 50,
  },
  {
    id: 'absence-calendar',
    title: 'Enter absence / vacation',
    description: 'Team calendar 2026–2027.',
    href: '/agent-daily-log/team-calendar',
    sortOrder: 60,
  },
  {
    id: 'board',
    title: 'Board & trackboard',
    description: 'Cases, incidents, escalations overview.',
    href: '/board',
    sortOrder: 70,
  },
  {
    id: 'all-cases',
    title: 'All cases',
    description: 'Search and manage cases.',
    href: '/cases',
    sortOrder: 80,
  },
];

export const DEFAULT_CHECKLIST_TEMPLATE_ROWS: DailyChecklistTemplateRow[] = [
  {
    id: 'c1_coverage',
    label: '1. Start: who else is on GDPR today; queue split agreed if 2+ agents',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: '/board',
    sortOrder: 10,
  },
  {
    id: 'c2_gmail_gdpr',
    label: '2. Gmail (GDPR label): queue worked — classify, route, follow linked checklists',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: 'https://mail.google.com/mail/u/0/',
    sortOrder: 20,
  },
  {
    id: 'c3_gmail_letters',
    label: '3. Gmail letters/faxes: Drive + sheet scan, rows verified, letters processed',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: 'https://drive.google.com/drive/',
    sortOrder: 30,
  },
  {
    id: 'c4_purecloud',
    label: '4. PureCloud GDPR queue: triaged, Jira if required, processed',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: 'https://apps.mypurecloud.de/',
    sortOrder: 40,
  },
  {
    id: 'c5_jira_hf',
    label: '5. Jira HF queue: new tickets, replies, 30-day deadline risks',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: 'https://hellofresh.atlassian.net/jira/',
    sortOrder: 50,
  },
  {
    id: 'c6_jira_factor',
    label: '6. Jira Factor queue: new tickets & replies',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: 'https://hellofresh.atlassian.net/jira/',
    sortOrder: 60,
  },
  {
    id: 'mineos',
    label: '7. MineOS / OWL used today for deletions or exceptions (per SOP)',
    docUrl: CONFLUENCE_HUB,
    toolUrl: '/cases',
    sortOrder: 70,
  },
  {
    id: 'trackboard',
    label: '8. GDPR Assistant trackboard (cases, incidents, escalations) reviewed',
    docUrl: CONFLUENCE_HUB,
    toolUrl: '/board',
    sortOrder: 80,
  },
  {
    id: 'c7_eod',
    label: '9. End of day: queues at zero or pending noted; 30-day Jira filter checked',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: 'https://hellofresh.atlassian.net/jira/',
    sortOrder: 90,
  },
  {
    id: 'c8_weekly',
    label: '10. Weekly (e.g. Friday): Ad-revocation CSV + Agent Feedback — done if due today',
    docUrl: CONFLUENCE_DAILY_QUEUE,
    toolUrl: '/reporting',
    sortOrder: 100,
  },
  {
    id: 'roster_aware',
    label: '11. Shift plan, vacation & handover (see notes below + team calendar)',
    docUrl: CONFLUENCE_HUB,
    toolUrl: '/agent-daily-log/team-calendar',
    sortOrder: 110,
  },
];
