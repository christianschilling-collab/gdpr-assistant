/**
 * Error Display Component with Retry Button
 */

import Link from 'next/link';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  backLink?: string;
  backLinkText?: string;
  showRetry?: boolean;
}

export function ErrorDisplay({
  title = 'Error',
  message,
  onRetry,
  backLink,
  backLinkText = '← Back',
  showRetry = true,
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-400 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
              <p className="text-sm text-red-700 mb-4">{message}</p>
              <div className="flex flex-wrap gap-3">
                {showRetry && onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    🔄 Retry
                  </button>
                )}
                {backLink && (
                  <Link
                    href={backLink}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                  >
                    {backLinkText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
