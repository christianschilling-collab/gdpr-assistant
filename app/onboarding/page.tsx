'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const FEATURES = [
  {
    id: 'board',
    number: '01',
    title: 'BOARD',
    headline: 'A real-time overview of all open items.',
    description: 'The Board shows every open case, escalation, and incident in one view, sorted automatically by urgency. Rows are color-coded: red for items that need immediate action (e.g. overdue breach notifications), orange for escalated matters with legal or regulatory involvement, yellow when a deadline is more than halfway elapsed, and green for items in normal progress. Use the filter bar at the top to narrow by type, assigned agent, or market.',
    image: 'board.png',
  },
  {
    id: 'cases',
    number: '02',
    title: 'CASES',
    headline: 'Individual GDPR requests, worked as structured tickets.',
    description: 'Cases cover day-to-day GDPR requests - Art. 15-22 subject rights, marketing opt-outs, deletion requests, and similar. Each case type has its own workflow with step-by-step checklists and a suggested reply template. The list can be filtered by status, market, urgency, and agent. As team lead, you can use the agent filter to see the queue of individual team members.',
    image: 'cases.png',
  },
  {
    id: 'escalations',
    number: '03',
    title: 'ESCALATIONS',
    headline: 'For requests that require legal team involvement.',
    description: 'An escalation is created when a GDPR request cannot be resolved at agent level and requires coordination with Legal or an external authority. Each escalation records the submission date, the reply deadline, which team owns which action item, and a full communication timeline. The status (Not Started / In Progress / Blocked / Closed) is updated manually as the case progresses.',
    image: 'escalations.png',
  },
  {
    id: 'incidents',
    number: '04',
    title: 'INCIDENTS',
    headline: 'Documenting data breaches under Art. 33 GDPR.',
    description: 'Incidents are used for data breaches and security events. A six-stage workflow guides the team from initial reporting through investigation, containment, resolution, and post-incident review. Each incident captures the affected systems, the number of impacted customers by country, the breach type, and a structured action plan with assigned owners and due dates. All stage transitions are logged in the audit trail.',
    image: 'incidents.png',
  },
  {
    id: 'reporting',
    number: '05',
    title: 'REPORTING',
    headline: 'Weekly and monthly summaries by market.',
    description: 'The Reporting dashboard generates activity summaries across all European markets. Each report shows deletion requests, portability requests, legal escalations, and an overall market status indicator. The monthly view includes a narrative summary suitable for management briefings. Reports can be exported as PDF or CSV.',
    image: 'reporting.png',
  },
  {
    id: 'admin',
    number: '06',
    title: 'ADMIN',
    headline: 'Settings, templates, and user management.',
    description: 'The Admin area is for team leads and administrators. From here you can manage case categories, update response templates for each request type, configure workflow steps, manage user access and roles, and configure reporting. Weekly market data is submitted by teams via the Reporting web form. Most changes take effect immediately for all users.',
    image: 'admin.png',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('board');

  useEffect(() => {
    const handleScroll = () => {
      const sections = FEATURES.map(f => f.id);
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('board')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <Image 
              src="/hellofresh-logo.png" 
              alt="HelloFresh Logo" 
              width={160} 
              height={50}
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            GDPR Assistant - How it works
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            This page explains the main areas of the tool and what each section is used for.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={scrollToFeatures}
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Jump to a section ↓
            </button>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Open the Dashboard →
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 py-16 relative">
        <div className="lg:pr-64">
          {FEATURES.map((feature, index) => (
            <div key={feature.id}>
              <section
                id={feature.id}
                className="py-16 flex flex-col gap-6"
              >
                {/* Text Content */}
                <div className="max-w-[680px]">
                  <div className="text-sm font-bold text-gray-500 tracking-wider mb-2">
                    {feature.number} - {feature.title}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {feature.headline}
                  </h2>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Screenshot */}
                <div className="w-full">
                  <FeatureImage filename={feature.image} alt={feature.title} />
                </div>
              </section>

              {index < FEATURES.length - 1 && (
                <div className="border-t border-gray-200 my-8"></div>
              )}
            </div>
          ))}
        </div>

        {/* Sticky Sidebar (Desktop Only) */}
        <aside className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 w-48">
          <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="space-y-2">
              {FEATURES.map((feature) => (
                <a
                  key={feature.id}
                  href={`#${feature.id}`}
                  className={`block text-sm py-2 px-3 rounded transition-colors ${
                    activeSection === feature.id
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {feature.title}
                </a>
              ))}
            </div>
          </nav>
        </aside>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold text-lg transition-colors"
          >
            Open the GDPR Assistant →
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureImage({ filename, alt }: { filename: string; alt: string }) {
  const [imageExists, setImageExists] = useState(true);
  const imagePath = `/onboarding/${filename}`;

  return (
    <div className="w-full">
      {imageExists ? (
        <Image
          src={imagePath}
          alt={alt}
          width={1200}
          height={800}
          className="w-full max-w-full h-auto rounded-xl shadow-lg border border-[#e2e8f0]"
          onError={() => setImageExists(false)}
        />
      ) : (
        <div className="w-full h-[400px] bg-gray-200 rounded-xl shadow-lg border border-[#e2e8f0] flex items-center justify-center">
          <span className="text-gray-500 text-lg font-medium">
            Screenshot coming soon
          </span>
        </div>
      )}
    </div>
  );
}
