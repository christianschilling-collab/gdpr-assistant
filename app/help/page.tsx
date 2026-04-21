'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const FAQs: FAQ[] = [
  {
    category: 'Cases',
    question: 'Wie erstelle ich einen neuen Case?',
    answer: 'Gehe zu "Cases" → "New Case" und fülle das Formular aus. Alternativ kannst du Cases per CSV importieren über "Cases" → "Import".',
  },
  {
    category: 'Cases',
    question: 'Wie funktioniert die AI-Verarbeitung?',
    answer: 'Klicke auf "Process with AI" auf der Case-Detail-Seite. Die AI klassifiziert den Case, findet passende Templates und generiert einen Vorschlag für die Antwort.',
  },
  {
    category: 'Cases',
    question: 'Was sind Similar Cases?',
    answer: 'Similar Cases zeigt dir bereits gelöste ähnliche Fälle, damit du von früheren Lösungen lernen kannst. Die Ähnlichkeit wird basierend auf Kategorie, Market und Keywords berechnet.',
  },
  {
    category: 'Cases',
    question: 'Wie funktionieren Bulk Operations?',
    answer: 'Gehe zu "Cases" → "Bulk Actions", wähle mehrere Cases aus und führe Aktionen wie Status-Änderung, Assignment oder Urgency-Update gleichzeitig durch.',
  },
  {
    category: 'Templates',
    question: 'Wie bearbeite ich ein Template?',
    answer: 'Gehe zu "Templates", klicke auf "Edit" beim gewünschten Template. Du kannst Rich Text verwenden, Variables einfügen (z.B. {{customerName}}) und eine Vorschau sehen.',
  },
  {
    category: 'Templates',
    question: 'Was sind Template Variables?',
    answer: 'Variables wie {{customerName}}, {{caseId}}, {{market}} werden automatisch durch echte Werte ersetzt, wenn das Template verwendet wird.',
  },
  {
    category: 'Templates',
    question: 'Wie funktioniert Template Versioning?',
    answer: 'Jede Änderung am Template wird als neue Version gespeichert. Du kannst frühere Versionen ansehen und zu ihnen zurückkehren (Rollback).',
  },
  {
    category: 'Training',
    question: 'Wie sende ich Training an einen Agenten?',
    answer: 'Gehe zu "Training" → "Send Training", wähle die Agent-E-Mail und die gewünschten Kategorien aus. Du kannst auch Templates verwenden oder direkt von einem Case aus Training senden.',
  },
  {
    category: 'Training',
    question: 'Wie funktionieren Quizzes?',
    answer: 'Auf jeder Training-Kategorie-Seite findest du einen "Take Quiz" Button. Nach dem Bestehen erhältst du ein Zertifikat. Du kannst deine Ergebnisse im Agent Profile sehen.',
  },
  {
    category: 'Training',
    question: 'Was ist das Agent Profile?',
    answer: 'Das Agent Profile zeigt alle Trainings, Quiz-Ergebnisse, Zertifikate und eine Timeline aller Trainings, die an den Agenten gesendet wurden.',
  },
  {
    category: 'Reporting',
    question: 'Was zeigt das Reporting?',
    answer: 'Das Reporting zeigt KPIs wie Total Cases, Training Completion Rate, Market Pulse Score, Cases by Status/Market, Top Issues und automatische Recommendations.',
  },
  {
    category: 'Reporting',
    question: 'Wie funktioniert der Agent Performance Dashboard?',
    answer: 'Zeigt Metriken für jeden Agenten: Cases Processed, Average Resolution Time, Quality Score, Training Completion Rate, Quiz Scores und Certificates. Sortierbar nach verschiedenen Metriken.',
  },
  {
    category: 'Feedback',
    question: 'Wie gebe ich Feedback?',
    answer: 'Nach dem Abschließen eines Trainings erscheint automatisch ein Feedback-Modal. Bei Cases kannst du auf "Feedback" klicken, um Feedback zu AI-Suggestions zu geben.',
  },
  {
    category: 'Allgemein',
    question: 'Wie melde ich mich an?',
    answer: 'Klicke auf "Login" in der Navigation und wähle "Sign in with Google". Du musst dich anmelden, um Trainings zu absolvieren und Feedback zu geben.',
  },
  {
    category: 'Allgemein',
    question: 'Wie komme ich zur Admin-Seite?',
    answer: 'Die Admin-Seite ist über die Navigation erreichbar (nur für authentifizierte Benutzer). Dort kannst du Training-Kategorien, Quizzes und Templates verwalten.',
  },
];

const QUICK_LINKS = [
  { title: 'Cases erstellen', href: '/cases/new', description: 'Neuen GDPR Case anlegen' },
  { title: 'Cases importieren', href: '/cases/import', description: 'Bulk Import per CSV' },
  { title: 'Templates verwalten', href: '/templates', description: 'Response Templates bearbeiten' },
  { title: 'Training senden', href: '/training/send', description: 'Training an Agenten senden' },
  { title: 'Reporting', href: '/reporting', description: 'KPIs und Reports ansehen' },
  { title: 'Agent Performance', href: '/reporting/agents', description: 'Agent-Metriken vergleichen' },
];

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Safely get search params
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const topicParam = searchParams.get('topic');
      if (topicParam) {
        setSelectedCategory(topicParam);
      }
    } catch (error) {
      // Ignore errors if search params can't be read
      console.warn('Could not read search params:', error);
    }
  }, []);

  const categories = Array.from(new Set(FAQs.map((f) => f.category)));

  const filteredFAQs = FAQs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hilfe & Support</h1>
          <p className="text-gray-600">Finde Antworten auf deine Fragen und lerne, wie du das Tool optimal nutzt</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Fragen oder Antworten..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Schnellzugriff</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-1">{link.title}</h3>
                <p className="text-sm text-gray-600">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Alle
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Häufig gestellte Fragen ({filteredFAQs.length})
          </h2>
          {filteredFAQs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Keine Ergebnisse gefunden. Versuche eine andere Suche.</p>
            </div>
          ) : (
            filteredFAQs.map((faq, idx) => (
              <FAQItem key={idx} faq={faq} />
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">Weitere Hilfe benötigt?</h2>
          <p className="text-blue-800 mb-4">
            Wenn du keine Antwort auf deine Frage findest, kontaktiere bitte den Support.
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:support@example.com"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📧 Support kontaktieren
            </a>
            <Link
              href="/"
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ faq }: { faq: FAQ }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1">
          <span className="text-xs font-medium text-indigo-600 mb-1 block">{faq.category}</span>
          <h3 className="font-semibold text-gray-900">{faq.question}</h3>
        </div>
        <span className="text-gray-400 ml-4">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-gray-700 whitespace-pre-line">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}
