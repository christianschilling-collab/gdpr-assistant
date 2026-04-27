'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import { getAllUsers } from '@/lib/firebase/users';
import type { UserProfile } from '@/lib/firebase/users';

interface Question {
  id: string;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  options: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  passingScore: number;
  timeLimit?: number; // in minutes
  category: string;
}

interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  startedAt: Date;
  completedAt?: Date;
  answers: { questionId: string; answer: string | string[] }[];
  score: number;
  passed: boolean;
  timeSpent: number; // in seconds
}

interface Certification {
  id: string;
  name: string;
  description: string;
  requiredQuizzes: string[];
  level: 'basic' | 'intermediate' | 'advanced';
  validityPeriod: number; // in months
  issuedTo?: string[];
}

export default function CertificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'quizzes' | 'certifications' | 'results'>('quizzes');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | string[]>>({});
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

  // GDPR Knowledge Quizzes based on GDPR Team Hub content
  const gdprQuizzes: Quiz[] = [
    {
      id: 'gdpr_basics',
      title: 'GDPR Team Hub Basics',
      description: 'Test your knowledge of basic GDPR workflows from the Team Hub',
      passingScore: 80,
      timeLimit: 15,
      category: 'basics',
      questions: [
        {
          id: 'q1',
          question: 'What is the primary tool for processing customer deletion requests?',
          type: 'single_choice',
          options: ['Jira', 'MineOS', 'OWL', 'PureCloud'],
          correctAnswer: 'MineOS',
          explanation: 'MineOS handles deletion requests with autopilot, flagging exceptions for manual review.',
          difficulty: 'easy',
          category: 'systems'
        },
        {
          id: 'q2',
          question: 'Which systems are used for DSAR processing? (Select all that apply)',
          type: 'multiple_choice',
          options: ['Jira', 'OWL', 'PureCloud/Genesys', 'DSAR Google Drive', 'Stop Email Sheet'],
          correctAnswer: ['Jira', 'OWL', 'PureCloud/Genesys', 'DSAR Google Drive'],
          explanation: 'DSARs require data extraction from multiple systems and secure file storage.',
          difficulty: 'medium',
          category: 'workflows'
        },
        {
          id: 'q3',
          question: 'The DSAR Google Drive automatically deletes files after 6 weeks.',
          type: 'true_false',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Files are auto-deleted after 6 weeks to minimize data retention.',
          difficulty: 'easy',
          category: 'compliance'
        },
        {
          id: 'q4',
          question: 'What should you do when receiving a police inquiry?',
          type: 'single_choice',
          options: [
            'Process immediately like other requests',
            'Escalate to Legal team immediately',
            'Handle via normal customer service',
            'Ignore until proper documentation'
          ],
          correctAnswer: 'Escalate to Legal team immediately',
          explanation: 'Police inquiries require Legal review and proper documentation verification.',
          difficulty: 'medium',
          category: 'escalation'
        },
        {
          id: 'q5',
          question: 'Which tool tracks non-customer email opt-out requests?',
          type: 'single_choice',
          options: ['DP Blacklist', 'Stop Email Sheet', 'OWL', 'Comms Portal'],
          correctAnswer: 'Stop Email Sheet',
          explanation: 'Stop Email Sheet is specifically for non-customer email ad revocations.',
          difficulty: 'easy',
          category: 'systems'
        }
      ]
    },
    {
      id: 'classification_advanced',
      title: 'Request Classification Mastery',
      description: 'Advanced scenarios for classifying GDPR requests correctly',
      passingScore: 85,
      timeLimit: 20,
      category: 'advanced',
      questions: [
        {
          id: 'adv1',
          question: 'A customer emails asking to "remove all my information and close my account permanently". This is classified as:',
          type: 'single_choice',
          options: ['DSAR', 'Deletion Request', 'Ad Revocation', 'Account Closure'],
          correctAnswer: 'Deletion Request',
          explanation: 'This is a clear deletion request and should be processed via MineOS.',
          difficulty: 'medium',
          category: 'classification'
        },
        {
          id: 'adv2',
          question: 'When should you use the "Incident Log"? (Select all that apply)',
          type: 'multiple_choice',
          options: [
            'Police inquiries',
            'Suspected data breaches',
            'Death notices',
            'Regular deletion requests',
            'Serious customer complaints'
          ],
          correctAnswer: ['Police inquiries', 'Suspected data breaches', 'Death notices', 'Serious customer complaints'],
          explanation: 'Incident Log is for serious cases that require tracking and management oversight.',
          difficulty: 'hard',
          category: 'workflows'
        },
        {
          id: 'adv3',
          question: 'Non-DACH market requests should be processed by the DACH team.',
          type: 'true_false',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Non-DACH requests should be routed to appropriate regional teams using the Non-DACH Routing guide.',
          difficulty: 'medium',
          category: 'routing'
        }
      ]
    }
  ];

  // Certification Programs
  const certificationPrograms: Certification[] = [
    {
      id: 'gdpr_team_basic',
      name: 'GDPR Team Member Certified',
      description: 'Basic certification for new GDPR team members covering essential workflows and tools',
      requiredQuizzes: ['gdpr_basics'],
      level: 'basic',
      validityPeriod: 12,
      issuedTo: []
    },
    {
      id: 'gdpr_expert',
      name: 'GDPR Expert Certified',
      description: 'Advanced certification for senior team members and trainers',
      requiredQuizzes: ['gdpr_basics', 'classification_advanced'],
      level: 'advanced',
      validityPeriod: 24,
      issuedTo: []
    }
  ];

  useEffect(() => {
    if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
      router.push('/cases');
      return;
    }
    
    setQuizzes(gdprQuizzes);
    setCertifications(certificationPrograms);
    loadUsers();
  }, [user, router]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizStartTime(new Date());
    setShowResults(false);
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (activeQuiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const finishQuiz = () => {
    if (!activeQuiz || !quizStartTime || !user?.email) return;
    
    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - quizStartTime.getTime()) / 1000);
    
    // Calculate score
    let correctAnswers = 0;
    const answers: { questionId: string; answer: string | string[] }[] = [];
    
    activeQuiz.questions.forEach(question => {
      const userAnswer = quizAnswers[question.id];
      answers.push({ questionId: question.id, answer: userAnswer || '' });
      
      if (question.type === 'multiple_choice') {
        const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
        const correctArray = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
        if (userAnswerArray.length === correctArray.length && 
            userAnswerArray.every(ans => correctArray.includes(ans))) {
          correctAnswers++;
        }
      } else {
        if (userAnswer === question.correctAnswer) {
          correctAnswers++;
        }
      }
    });
    
    const score = Math.round((correctAnswers / activeQuiz.questions.length) * 100);
    const passed = score >= activeQuiz.passingScore;
    
    const attempt: QuizAttempt = {
      id: Date.now().toString(),
      userId: user.email,
      quizId: activeQuiz.id,
      startedAt: quizStartTime,
      completedAt: endTime,
      answers,
      score,
      passed,
      timeSpent
    };
    
    setAttempts(prev => [...prev, attempt]);
    setLastAttempt(attempt);
    setShowResults(true);
    setActiveQuiz(null);
  };

  const getUserAttempts = (userId: string, quizId?: string) => {
    return attempts.filter(attempt => 
      attempt.userId === userId && (!quizId || attempt.quizId === quizId)
    );
  };

  const getPassedQuizzes = (userId: string) => {
    return attempts.filter(attempt => 
      attempt.userId === userId && attempt.passed
    ).map(attempt => attempt.quizId);
  };

  const isEligibleForCertification = (userId: string, certification: Certification) => {
    const passedQuizzes = getPassedQuizzes(userId);
    return certification.requiredQuizzes.every(quizId => passedQuizzes.includes(quizId));
  };

  if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
    return null;
  }

  // Quiz Taking Interface
  if (activeQuiz && !showResults) {
    const currentQuestion = activeQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100;
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Quiz Header */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{activeQuiz.title}</h1>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                  {activeQuiz.timeLimit && (
                    <span>Time Limit: {activeQuiz.timeLimit} minutes</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">{currentQuestion.category}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {currentQuestion.question}
                </h2>
              </div>

              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentQuestion.type === 'multiple_choice' 
                    ? (Array.isArray(quizAnswers[currentQuestion.id]) && 
                       (quizAnswers[currentQuestion.id] as string[]).includes(option))
                    : quizAnswers[currentQuestion.id] === option;
                  
                  return (
                    <label
                      key={index}
                      className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {currentQuestion.type === 'multiple_choice' ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentAnswers = Array.isArray(quizAnswers[currentQuestion.id]) 
                                ? quizAnswers[currentQuestion.id] as string[]
                                : [];
                              
                              if (e.target.checked) {
                                handleAnswerChange(currentQuestion.id, [...currentAnswers, option]);
                              } else {
                                handleAnswerChange(currentQuestion.id, currentAnswers.filter(a => a !== option));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        ) : (
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(currentQuestion.id, option)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                        )}
                        <span className="text-gray-900">{option}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={nextQuestion}
                  disabled={!quizAnswers[currentQuestion.id] || 
                    (currentQuestion.type === 'multiple_choice' && 
                     Array.isArray(quizAnswers[currentQuestion.id]) && 
                     (quizAnswers[currentQuestion.id] as string[]).length === 0)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestionIndex === activeQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Results
  if (showResults && lastAttempt) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center mb-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                lastAttempt.passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <span className="text-4xl">
                  {lastAttempt.passed ? '🎉' : '📚'}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {lastAttempt.passed ? 'Congratulations!' : 'Keep Learning!'}
              </h2>
              <p className="text-gray-600 mb-6">
                {lastAttempt.passed 
                  ? 'You have successfully passed the quiz!'
                  : 'You can retake this quiz to improve your score.'
                }
              </p>
              
              <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${lastAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {lastAttempt.score}%
                  </div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.floor(lastAttempt.timeSpent / 60)}m
                  </div>
                  <div className="text-sm text-gray-600">Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {quizzes.find(q => q.id === lastAttempt.quizId)?.passingScore}%
                  </div>
                  <div className="text-sm text-gray-600">Required</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowResults(false);
                  setLastAttempt(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Quizzes
              </button>
              {!lastAttempt.passed && (
                <button
                  onClick={() => {
                    const quiz = quizzes.find(q => q.id === lastAttempt.quizId);
                    if (quiz) startQuiz(quiz);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Retake Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Testing & Certification</h1>
          <p className="text-gray-600 mt-1">GDPR proficiency testing based on Team Hub content</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['quizzes', 'certifications', 'results'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    selectedTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Quizzes Tab */}
        {selectedTab === 'quizzes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {quiz.questions.length} questions
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {quiz.passingScore}% to pass
                    </span>
                    {quiz.timeLimit && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                        {quiz.timeLimit} min limit
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Category: <span className="font-medium">{quiz.category}</span>
                  </div>
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications Tab */}
        {selectedTab === 'certifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certifications.map((cert) => (
              <div key={cert.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{cert.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      cert.level === 'advanced' ? 'bg-purple-100 text-purple-800' :
                      cert.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {cert.level.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{cert.description}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Required Quizzes:</h4>
                  <div className="space-y-1">
                    {cert.requiredQuizzes.map(quizId => {
                      const quiz = quizzes.find(q => q.id === quizId);
                      const userPassed = user?.email && getUserAttempts(user.email, quizId).some(a => a.passed);
                      
                      return quiz ? (
                        <div key={quizId} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${userPassed ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className={userPassed ? 'text-green-700' : 'text-gray-600'}>
                            {quiz.title} {userPassed ? '✓' : ''}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Valid for: {cert.validityPeriod} months
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Tab */}
        {selectedTab === 'results' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Quiz Results Overview</h2>
            </div>
            <div className="p-6">
              {attempts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No quiz attempts yet
                </div>
              ) : (
                <div className="space-y-4">
                  {attempts.map((attempt) => {
                    const quiz = quizzes.find(q => q.id === attempt.quizId);
                    return (
                      <div key={attempt.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {quiz?.title || 'Unknown Quiz'}
                            </h3>
                            <div className="text-sm text-gray-600">
                              {attempt.completedAt?.toLocaleDateString()} • 
                              {Math.floor(attempt.timeSpent / 60)}m {attempt.timeSpent % 60}s
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              attempt.passed ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {attempt.score}%
                            </div>
                            <div className={`text-sm ${
                              attempt.passed ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {attempt.passed ? 'PASSED' : 'FAILED'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}