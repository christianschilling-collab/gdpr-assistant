'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { HelpModal, HelpButton } from '@/components/HelpModal';
import { HELP_CONTENT } from '@/lib/constants/helpContent';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Check if user is logged in and is an admin
    if (!user) {
      // Not logged in - redirect to home
      router.push('/');
      return;
    }

    // Check email directly (fallback if Firestore not set up)
    if (user.email && isGdprAssistantAdminEmail(user.email)) {
      console.log('✅ Admin access granted by email:', user.email);
      setIsAdmin(true);
    } else {
      // Not an admin - redirect to cases
      console.log('❌ Not an admin, redirecting to cases');
      router.push('/cases');
    }
    setLoading(false);
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin area.</p>
          <Link
            href="/cases"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Cases
          </Link>
        </div>
      </div>
    );
  }

  const getIconComponent = (iconName: string) => {
    const iconProps = { className: "w-8 h-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" };
    const pathProps = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 2 };

    const icons: Record<string, JSX.Element> = {
      users: (
        <svg {...iconProps}>
          <path {...pathProps} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      document: (
        <svg {...iconProps}>
          <path {...pathProps} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      chart: (
        <svg {...iconProps}>
          <path {...pathProps} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      presentation: (
        <svg {...iconProps}>
          <path {...pathProps} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      tag: (
        <svg {...iconProps}>
          <path {...pathProps} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      identification: (
        <svg {...iconProps}>
          <path {...pathProps} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
      book: (
        <svg {...iconProps}>
          <path {...pathProps} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      exclamation: (
        <svg {...iconProps}>
          <path {...pathProps} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      upload: (
        <svg {...iconProps}>
          <path {...pathProps} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      workflow: (
        <svg {...iconProps}>
          <path {...pathProps} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      clipboard: (
        <svg {...iconProps}>
          <path {...pathProps} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    };

    return icons[iconName] || icons.document;
  };

  const adminSections = [
    {
      title: 'Training',
      description: 'GDPR training wiki, quizzes, and certification',
      icon: 'book',
      href: '/training',
      color: 'blue',
    },
    {
      title: 'Help & Documentation',
      description: 'User guides and system documentation',
      icon: 'exclamation',
      href: '/help',
      color: 'purple',
    },
    {
      title: 'User Management',
      description: 'Manage user access and roles (Admin/Agent)',
      icon: 'users',
      href: '/admin/users',
      color: 'blue',
    },
    {
      title: 'Daily queue',
      description: 'Agent daily log: next-action links and checklist template (Firestore)',
      icon: 'clipboard',
      href: '/admin/daily-queue',
      color: 'green',
    },
    {
      title: 'Templates',
      description: 'Manage response templates for different GDPR request types',
      icon: 'document',
      href: '/templates',
      color: 'indigo',
    },
    {
      title: 'Analytics',
      description: 'View case statistics, agent performance, and trends',
      icon: 'chart',
      href: '/analytics',
      color: 'purple',
    },
    {
      title: 'Reporting',
      description: 'Manage weekly reports and monthly summaries',
      icon: 'presentation',
      href: '/reporting',
      color: 'green',
    },
    {
      title: 'Categories',
      description: 'Manage GDPR request categories',
      icon: 'tag',
      href: '/admin/categories',
      color: 'yellow',
    },
    {
      title: 'Requester Types',
      description: 'Manage requester type classifications',
      icon: 'identification',
      href: '/admin/requester-types',
      color: 'pink',
    },
    {
      title: 'Training Content',
      description: 'Manage training wiki and educational content',
      icon: 'book',
      href: '/admin/training',
      color: 'indigo',
    },
    {
      title: 'Training Cases',
      description: 'Upload and review agent error cases for training',
      icon: 'exclamation',
      href: '/admin/training-cases/upload',
      color: 'red',
    },
    {
      title: 'Weekly market report',
      description: 'Submit numbers and structured activity notes per market and week',
      icon: 'upload',
      href: '/reporting/submit',
      color: 'teal',
    },
    {
      title: 'Edit reporting data',
      description: 'Correct weekly numbers, risk text, activity rows, and individual log lines',
      icon: 'clipboard',
      href: '/admin/reporting/edit',
      color: 'gray',
    },
    {
      title: 'Market Deep Dive',
      description: 'Create monthly Market Deep Dive reports for management',
      icon: 'chart',
      href: '/reporting/overrides',
      color: 'purple',
    },
    {
      title: 'Workflow Management',
      description: 'Assign workflows to Case Type + Requester Type combinations',
      icon: 'workflow',
      href: '/admin/workflows',
      color: 'blue',
    },
    {
      title: 'Workflow Templates',
      description: 'Create and edit multi-step workflow templates',
      icon: 'document',
      href: '/admin/workflows/list',
      color: 'indigo',
    },
    {
      title: 'Task Templates',
      description: 'Configure auto-generated tasks for incident phases',
      icon: 'clipboard',
      href: '/admin/task-templates',
      color: 'orange',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage system settings and content</p>
            </div>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Logged in as:</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
        </div>

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`
                bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6
                hover:shadow-lg hover:border-${section.color}-300 transition-all
                group cursor-pointer
              `}
            >
              <div className="flex items-start gap-4">
                <div className="text-gray-600 group-hover:text-blue-600 transition-colors">
                  {getIconComponent(section.icon)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
                <svg 
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <h2 className="text-lg font-bold text-blue-900">Admin Access</h2>
          </div>
          <p className="text-sm text-blue-800">
            Only users with admin email addresses can access this area. Current admin list is managed in the Navigation component.
          </p>
        </div>
      </div>
      
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)}
        title={HELP_CONTENT.adminDashboard.title}
        sections={HELP_CONTENT.adminDashboard.sections}
      />
    </div>
  );
}
