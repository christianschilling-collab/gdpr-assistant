'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import { 
  getAllTrainingContent, 
  createTrainingContent, 
  updateTrainingContent, 
  deleteTrainingContent,
  seedDefaultTrainingContent
} from '@/lib/firebase/training-content';
import type { TrainingContent } from '@/lib/types/training-content';

export default function TrainingContentManagementPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | TrainingContent['type']>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContent, setEditingContent] = useState<TrainingContent | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Check admin access
  const isAdmin = user?.email && isGdprAssistantAdminEmail(user.email);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    loadTrainingContent();
  }, [isAdmin, router]);

  const loadTrainingContent = async () => {
    try {
      setLoading(true);
      const content = await getAllTrainingContent();
      setTrainingContent(content);
    } catch (error) {
      console.error('Error loading training content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedContent = async () => {
    try {
      setSeeding(true);
      await seedDefaultTrainingContent();
      await loadTrainingContent();
      alert('Default training content seeded successfully!');
    } catch (error) {
      console.error('Error seeding content:', error);
      alert('Error seeding content: ' + (error as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteContent = async (id: string, title: string) => {
    if (!confirm(`Delete training content "${title}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTrainingContent(id);
      await loadTrainingContent();
      alert('Training content deleted successfully!');
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Error deleting content: ' + (error as Error).message);
    }
  };

  const filteredContent = trainingContent.filter(content => 
    selectedType === 'all' || content.type === selectedType
  );

  const getTypeColor = (type: TrainingContent['type']) => {
    switch (type) {
      case 'classification_tree': return 'bg-blue-100 text-blue-800';
      case 'queue_dashboard': return 'bg-green-100 text-green-800';
      case 'escalation_assistant': return 'bg-red-100 text-red-800';
      case 'certification': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: TrainingContent['category']) => {
    switch (category) {
      case 'fundamentals': return 'bg-yellow-100 text-yellow-800';
      case 'tools': return 'bg-green-100 text-green-800';
      case 'processes': return 'bg-blue-100 text-blue-800';
      case 'practice': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading training content...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Training Content Management</h1>
              <p className="text-gray-600 mt-1">Manage interactive training materials and content</p>
            </div>
            <div className="flex items-center gap-3">
              {trainingContent.length === 0 && (
                <button
                  onClick={handleSeedContent}
                  disabled={seeding}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {seeding ? 'Seeding...' : '🌱 Seed Default Content'}
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ➕ Create Content
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="classification_tree">Classification Tree</option>
                <option value="queue_dashboard">Queue Dashboard</option>
                <option value="escalation_assistant">Escalation Assistant</option>
                <option value="certification">Certification</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Training Content ({filteredContent.length})
            </h2>
          </div>
          
          {filteredContent.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No training content found</h3>
              <p className="text-gray-600 mb-6">
                {trainingContent.length === 0 
                  ? 'Get started by seeding default content or creating new training materials.'
                  : 'No content matches the selected filters.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredContent.map((content) => (
                <div key={content.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{content.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getTypeColor(content.type)}`}>
                            {content.type.replace('_', ' ')}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getCategoryColor(content.category)}`}>
                            {content.category}
                          </span>
                          {content.day && (
                            <span className="inline-flex px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">
                              Day {content.day}
                            </span>
                          )}
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                            content.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {content.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{content.description}</p>
                      
                      <div className="text-sm text-gray-500">
                        Created by {content.createdBy} • Last updated {content.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setEditingContent(content)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-300"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContent(content.id, content.title)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-300"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Status */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🚧</span>
            <div>
              <h3 className="text-lg font-bold text-blue-900">Development Status</h3>
              <p className="text-blue-800 text-sm">Training Content Management System is ready for configuration</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">✅ Already Implemented:</h4>
              <ul className="space-y-1 text-blue-800">
                <li>• Classification Tree (Decision Tree Logic)</li>
                <li>• Queue Dashboard (Daily Workflows)</li>
                <li>• Escalation Assistant (POC Directory)</li>
                <li>• Backend Infrastructure (CRUD Operations)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">🚧 Next Steps:</h4>
              <ul className="space-y-1 text-blue-800">
                <li>• Content Editor UI (JSON/Form-based)</li>
                <li>• Decision Tree Visual Editor</li>
                <li>• POC Directory Management</li>
                <li>• Content Migration from Hardcoded</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}