'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAllUsers } from '@/lib/firebase/users';
import type { UserProfile } from '@/lib/firebase/users';

export function UserSwitcher() {
  const { user, userProfile, isImpersonating, originalUser, switchToUser, switchBackToOriginal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only show for christian.schilling@hellofresh.de
  if (!user?.email || user.email !== 'christian.schilling@hellofresh.de') {
    return null;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      loadUsers();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers.filter(u => u.email !== 'christian.schilling@hellofresh.de'));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async (email: string) => {
    await switchToUser(email);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSwitchBack = () => {
    switchBackToOriginal();
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'team_lead': return 'bg-blue-100 text-blue-800';
      case 'legal': return 'bg-purple-100 text-purple-800';
      case 'agent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isImpersonating 
            ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Switch User (Testing Mode)"
      >
        {isImpersonating ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="hidden sm:inline">
              {userProfile?.displayName?.split(' ')[0] || userProfile?.email?.split('@')[0]}
            </span>
            <span className="text-xs">(Testing)</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Switch User</span>
          </>
        )}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              🔄 Switch User (Testing Mode)
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Only available for christian.schilling@hellofresh.de
            </p>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search users... or type /su email"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                
                // Handle /su command
                if (value.startsWith('/su ')) {
                  const email = value.substring(4).trim();
                  if (email.includes('@')) {
                    handleSwitchUser(email);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.startsWith('/su ')) {
                  const email = searchTerm.substring(4).trim();
                  if (email.includes('@')) {
                    handleSwitchUser(email);
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Type "/su email@example.com" to switch directly
            </p>
          </div>

          {/* Current Status */}
          {isImpersonating && (
            <div className="p-3 bg-yellow-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-yellow-800">
                    Currently testing as: {userProfile?.displayName || userProfile?.email}
                  </div>
                  <div className="text-xs text-yellow-600">
                    Role: <span className={`px-1 py-0.5 rounded text-xs ${getRoleColor(userProfile?.role || 'agent')}`}>
                      {userProfile?.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSwitchBack}
                  className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300"
                >
                  Switch Back
                </button>
              </div>
            </div>
          )}

          {/* User List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSwitchUser(user.email)}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.displayName || 'No name'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs text-red-600">Inactive</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}