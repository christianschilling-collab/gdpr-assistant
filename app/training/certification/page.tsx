'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

export default function PublicCertificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Knowledge Check Questions based on GDPR Team Hub content
  const questions: Question[] = [
    {
      id: 'q1',
      question: 'What is the maximum timeframe for processing a customer deletion request?',
      options: ['7 days', '14 days', '30 days', '90 days'],
      correctAnswer: 2,
      explanation: 'Customer deletions must be completed within 30 days of the request, as per GDPR requirements.',
      category: 'Customer Requests'
    },
    {
      id: 'q2',
      question: 'Which tool is used for processing customer deletions?',
      options: ['OWL', 'MineOS', 'Jira', 'PureCloud'],
      correctAnswer: 1,
      explanation: 'MineOS is the primary system for processing customer deletion requests. OWL is used for customer data lookup.',
      category: 'Tools & Systems'
    },
    {
      id: 'q3',
      question: 'What should you do immediately when receiving a police inquiry?',
      options: ['Process the request immediately', 'Forward to Legal team', 'Ask customer for consent', 'Delete the request'],
      correctAnswer: 1,
      explanation: 'Police inquiries must be escalated to the Legal team immediately. Never process these requests without legal review.',
      category: 'Escalations'
    },
    {
      id: 'q4',
      question: 'Where should completed DSAR files be uploaded for customer access?',
      options: ['Regular email attachment', 'Slack channel', 'DSAR Google Drive', 'Customer portal'],
      correctAnswer: 2,
      explanation: 'DSAR files are uploaded to the dedicated DSAR Google Drive, which auto-deletes files after 6 weeks for security.',
      category: 'DSAR Processing'
    },
    {
      id: 'q5',
      question: 'What is the SLA for ad revocation requests?',
      options: ['24 hours', '3 days', '7 days', '30 days'],
      correctAnswer: 1,
      explanation: 'Ad revocation requests must be processed within 3 days to comply with marketing opt-out regulations.',
      category: 'Customer Requests'
    },
    {
      id: 'q6',
      question: 'Which system is used to verify customer identity and account information?',
      options: ['MineOS', 'Jira', 'OWL', 'GDPR Assistant'],
      correctAnswer: 2,
      explanation: 'OWL (OneWebLogin) is the customer identity and account management system used for verification.',
      category: 'Tools & Systems'
    },
    {
      id: 'q7',
      question: 'When should you create a Jira ticket?',
      options: ['Only for complex cases', 'For all GDPR requests', 'Only for DSAR requests', 'For escalations and DSARs'],
      correctAnswer: 3,
      explanation: 'Jira tickets are created for DSAR requests, escalations, and complex cases that need tracking.',
      category: 'Process'
    },
    {
      id: 'q8',
      question: 'What should you do with non-customer ad revocation requests?',
      options: ['Process in MineOS', 'Add to Stop Email Sheet', 'Forward to Legal', 'Ignore them'],
      correctAnswer: 1,
      explanation: 'Non-customer ad revocation requests are added to the Stop Email Sheet to prevent future marketing emails.',
      category: 'Customer Requests'
    },
    {
      id: 'q9',
      question: 'Which markets does the DACH GDPR team handle?',
      options: ['Germany only', 'DACH and Nordics', 'All European markets', 'Germany and Austria only'],
      correctAnswer: 1,
      explanation: 'The DACH GDPR team handles DACH (Germany, Austria, Switzerland) and Nordic markets (Denmark, Norway, Sweden).',
      category: 'Process'
    },
    {
      id: 'q10',
      question: 'What is the primary urgency indicator for escalating a case?',
      options: ['Customer is angry', 'Request involves police/legal authority', 'Request is complex', 'Customer called multiple times'],
      correctAnswer: 1,
      explanation: 'Police inquiries, legal authority requests, and regulatory contact are the highest priority escalation triggers.',
      category: 'Escalations'
    }
  ];

  const categories = ['all', ...Array.from(new Set(questions.map(q => q.category)))];
  
  const filteredQuestions = selectedCategory === 'all' 
    ? questions 
    : questions.filter(q => q.category === selectedCategory);

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  const totalQuestions = filteredQuestions.length;

  const handleAnswer = (selectedOption: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedOption;
    setAnswers(newAnswers);

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const calculateScore = () => {
    const correctAnswers = answers.reduce((count, answer, index) => {
      return count + (answer === filteredQuestions[index].correctAnswer ? 1 : 0);
    }, 0);
    return {
      correct: correctAnswers,
      total: totalQuestions,
      percentage: Math.round((correctAnswers / totalQuestions) * 100)
    };
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setShowResult(false);
  };

  const changeCategory = (category: string) => {
    setSelectedCategory(category);
    resetQuiz();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GDPR Knowledge Test</h1>
              <p className="text-gray-600 mt-1">Test your understanding of GDPR workflows and procedures</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Training
            </button>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-lg p-4 mb-6 border">
          <h3 className="font-medium text-gray-900 mb-3">Test Category:</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => changeCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        {!showResult ? (
          /* Quiz Interface */
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Progress */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {currentQuestion?.category}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question */}
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentQuestion?.question}
              </h2>

              <div className="space-y-3">
                {currentQuestion?.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center">
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-8 text-center">
              <div className="mb-6">
                {(() => {
                  const score = calculateScore();
                  const isPass = score.percentage >= 80;
                  return (
                    <>
                      <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl font-bold ${
                        isPass ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {score.percentage}%
                      </div>
                      
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {isPass ? 'Well Done!' : 'Keep Practicing!'}
                      </h2>
                      
                      <p className="text-gray-600 mb-4">
                        You scored {score.correct} out of {score.total} questions correctly
                      </p>

                      <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                        isPass ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isPass ? '✓ Passed' : '✗ Needs Improvement'} 
                        ({score.percentage}% - Pass: 80%+)
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-4 text-left max-w-2xl mx-auto">
                <h3 className="text-lg font-bold text-gray-900 text-center mb-4">Review Answers</h3>
                
                {filteredQuestions.map((question, index) => {
                  const userAnswer = answers[index];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <div key={question.id} className={`p-4 border rounded-lg ${
                      isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium">Question {index + 1}</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>
                      
                      <p className="text-gray-900 font-medium mb-2">{question.question}</p>
                      
                      <div className="text-sm space-y-1">
                        <div>
                          <strong>Your answer:</strong> {question.options[userAnswer]} 
                          {!isCorrect && <span className="text-red-600 ml-2">✗</span>}
                        </div>
                        {!isCorrect && (
                          <div>
                            <strong>Correct answer:</strong> {question.options[question.correctAnswer]} <span className="text-green-600 ml-2">✓</span>
                          </div>
                        )}
                        <div className="mt-2 text-gray-600">
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 space-x-4">
                <button
                  onClick={resetQuiz}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Take Test Again
                </button>
                <button
                  onClick={() => changeCategory('all')}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Try Different Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Study Guide */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📚 Study Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Key SLAs to Remember:</h4>
              <ul className="space-y-1">
                <li>• Customer Deletion: 30 days</li>
                <li>• Ad Revocation: 3 days</li>
                <li>• DSAR: 30 days</li>
                <li>• Police Inquiry: Immediate escalation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Essential Tools:</h4>
              <ul className="space-y-1">
                <li>• MineOS: Customer deletions</li>
                <li>• OWL: Customer verification</li>
                <li>• Jira: Tracking & DSARs</li>
                <li>• DSAR Google Drive: Secure file sharing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}