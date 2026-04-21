// Page-specific help content for context-sensitive help system

export const HELP_CONTENT = {
  casesList: {
    title: 'Cases List - Help',
    sections: [
      {
        title: 'Quick Stats Overview',
        items: [
          {
            label: 'Total',
            description: 'Total number of all GDPR cases in the system, regardless of status.',
          },
          {
            label: 'New',
            description: 'Cases that have just been created and have not been reviewed yet. These need immediate attention.',
          },
          {
            label: 'Under Review',
            description: 'Cases that are currently being processed by an agent. These are actively being worked on.',
          },
          {
            label: 'Resolved',
            description: 'Cases that have been completed and closed. These are archived for reference.',
          },
        ],
      },
      {
        title: 'Case Badges',
        items: [
          {
            label: 'High Priority',
            description: 'Urgent cases that require immediate action. These should be handled first.',
          },
          {
            label: 'Gmail Badge',
            description: 'Cases that came directly from Gmail (not from Jira). These typically need special handling.',
          },
          {
            label: 'AI Badge',
            description: 'Cases where the category was automatically classified by AI. Review for accuracy.',
          },
        ],
      },
      {
        title: 'Actions',
        items: [
          {
            label: 'Search',
            description: 'Search by Case ID (e.g., HELP-2026-123), description text, agent name, or customer number.',
          },
          {
            label: 'Export CSV',
            description: 'Download all filtered cases as a CSV file for further analysis in Excel or Google Sheets.',
          },
          {
            label: 'New Case',
            description: 'Create a new GDPR case. You will be guided through requester type, category selection, and details.',
          },
        ],
      },
    ],
  },

  caseDetail: {
    title: 'Case Detail View - Help',
    sections: [
      {
        title: 'Case Information',
        items: [
          {
            label: 'Status',
            description: 'Current state: New (just created), Under Review (being worked on), or Resolved (completed).',
          },
          {
            label: 'Urgency',
            description: 'Priority level. "High" means this case needs immediate attention.',
          },
          {
            label: 'Market',
            description: 'Geographic region (DACH, Nordics, BNL, France). Determines which team handles the case.',
          },
          {
            label: 'Customer Type',
            description: 'Who is making the request: Customer, Non-Customer, Employee, Applicant, or Funeral Home.',
          },
        ],
      },
      {
        title: 'Quick Actions',
        items: [
          {
            label: 'Process with AI',
            description: 'Re-run AI classification if you think the category or requester type is incorrect.',
          },
          {
            label: 'Mark as Resolved',
            description: 'Close this case and move it to "Resolved" status. Only do this when everything is complete.',
          },
          {
            label: 'Copy Jira Note',
            description: 'Copy a formatted summary to paste into Jira for handover or documentation.',
          },
          {
            label: 'Edit',
            description: 'Modify case details like description, urgency, market, or classification.',
          },
          {
            label: 'Delete',
            description: 'Permanently remove this case. Use with caution - this cannot be undone!',
          },
        ],
      },
      {
        title: 'Process Steps & Templates',
        items: [
          {
            label: 'Process Steps (Checklist)',
            description: 'Step-by-step instructions for handling this type of request. Check off each step as you complete it.',
          },
          {
            label: 'Confluence Links',
            description: 'Links to detailed documentation and process guides in Confluence.',
          },
          {
            label: 'Suggested Reply',
            description: 'Pre-written response template with placeholders. Copy and customize for the customer.',
          },
        ],
      },
    ],
  },

  templates: {
    title: 'Templates - Help',
    sections: [
      {
        title: 'Template Management',
        items: [
          {
            label: 'Import JSON',
            description: 'Upload templates created with AI (ChatGPT, Claude) from your documentation. Supports batch import.',
          },
          {
            label: 'Export All',
            description: 'Download all templates as JSON for backup, version control, or sharing with other teams.',
          },
          {
            label: 'New Template',
            description: 'Create a new response template manually with process steps, links, and reply text.',
          },
        ],
      },
      {
        title: 'Template Cards',
        items: [
          {
            label: 'Category & Requester Type',
            description: 'Determines when this template is suggested. E.g., "Data Deletion" for "Customer".',
          },
          {
            label: 'Export (per template)',
            description: 'Download a single template as JSON for editing with AI or sharing.',
          },
          {
            label: 'Edit',
            description: 'Modify template content, process steps, or Confluence links.',
          },
        ],
      },
      {
        title: 'Variables',
        items: [
          {
            label: 'Placeholders',
            description: 'Use {{customerName}}, {{caseId}}, {{market}}, {{date}}, {{agentName}} in your templates. They will be replaced automatically.',
          },
        ],
      },
    ],
  },

  adminDashboard: {
    title: 'Admin Dashboard - Help',
    sections: [
      {
        title: 'Core Settings',
        items: [
          {
            label: 'User Management',
            description: 'Control who can access the system. Assign Agent or Admin roles to team members.',
          },
          {
            label: 'Categories',
            description: 'Manage GDPR request types (Data Deletion, Marketing Opt-Out, etc.). Add new categories as needed.',
          },
          {
            label: 'Requester Types',
            description: 'Define who can make requests (Customer, Non-Customer, Employee, etc.).',
          },
        ],
      },
      {
        title: 'Content Management',
        items: [
          {
            label: 'Templates',
            description: 'Create and edit response templates for different request types.',
          },
          {
            label: 'Training Content',
            description: 'Manage training materials and educational content for agents.',
          },
          {
            label: 'Training Cases',
            description: 'Upload agent error cases for tracking trends and identifying training needs.',
          },
        ],
      },
      {
        title: 'Reporting & Analytics',
        items: [
          {
            label: 'Analytics',
            description: 'View case statistics, agent performance metrics, and system usage trends.',
          },
          {
            label: 'Reporting',
            description: 'Manage weekly market reports and generate monthly summaries for management.',
          },
          {
            label: 'Weekly Reports Upload',
            description: 'Import weekly report data from CSV (from Google Forms).',
          },
        ],
      },
    ],
  },

  analytics: {
    title: 'Analytics Dashboard - Help',
    sections: [
      {
        title: 'Metrics',
        items: [
          {
            label: 'Template Usage',
            description: 'See which templates are used most often. Helps identify gaps in documentation.',
          },
          {
            label: 'Cases by Category',
            description: 'Distribution of request types. Shows which GDPR requests are most common.',
          },
          {
            label: 'Cases by Market',
            description: 'Geographic breakdown. Helps with resource allocation and capacity planning.',
          },
        ],
      },
    ],
  },

  training: {
    title: 'Agent Training - Help',
    sections: [
      {
        title: 'Training Content',
        items: [
          {
            label: 'Error Categories',
            description: 'Common mistakes agents make when processing GDPR requests. Click to see detailed guidance.',
          },
          {
            label: 'Best Practices',
            description: 'Step-by-step guides for handling different types of GDPR requests correctly.',
          },
        ],
      },
    ],
  },

  reporting: {
    title: 'Reporting - Help',
    sections: [
      {
        title: 'Monthly Summary',
        items: [
          {
            label: 'KPIs',
            description: 'Key metrics: Total requests, deletions, portability cases, legal support cases, etc.',
          },
          {
            label: 'Risk Status (Traffic Light)',
            description: 'Green = On track, Yellow = Attention needed, Red = Critical. Based on workload and backlog.',
          },
          {
            label: 'Activity Log',
            description: 'Escalations, Wins, and Initiatives grouped by market and category.',
          },
          {
            label: 'Training Snapshot',
            description: 'Most common agent errors by market with trend indicators (up, down, flat).',
          },
        ],
      },
      {
        title: 'Actions',
        items: [
          {
            label: 'Copy Summary',
            description: 'Copy the entire report as HTML email format for sending to management.',
          },
          {
            label: 'Upload Weekly Report',
            description: 'Import new data from Google Forms CSV (Admin only).',
          },
        ],
      },
    ],
  },
};
