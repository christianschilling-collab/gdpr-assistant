'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAllUsers } from '@/lib/firebase/users';
import type { UserProfile } from '@/lib/firebase/users';

export function GlobalUserSwitcher() {
  const { user, switchToUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Only available for christian.schilling@hellofresh.de
  if (!user?.email || user.email !== 'christian.schilling@hellofresh.de') {
    return null;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        loadUsers();
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers.filter(u => u.email !== 'christian.schilling@hellofresh.de'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSwitchUser = async (email: string) => {
    await switchToUser(email);
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  // Handle /su command
  useEffect(() => {
    if (searchTerm.startsWith('/su ')) {
      const email = searchTerm.substring(4).trim();
      if (email.includes('@hellofresh.de') || email.includes('@')) {
        // Auto-complete if found in users
        const foundUser = users.find(u => u.email.toLowerCase().includes(email.toLowerCase()));
        if (foundUser && email.length > 10) {
          handleSwitchUser(foundUser.email);
        }
      }
    }
  }, [searchTerm, users]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Switch User</h2>
            <div className="text-xs text-gray-500">⌘K</div>
          </div>
          
          <input
            type="text"
            placeholder="Search users or type /su email@hellofresh.de"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchTerm.startsWith('/su ')) {
                  const email = searchTerm.substring(4).trim();
                  if (email.includes('@')) {
                    handleSwitchUser(email);
                  }
                } else if (filteredUsers.length > 0) {
                  handleSwitchUser(filteredUsers[0].email);
                }
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          
          {searchTerm.startsWith('/su ') && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
              💡 Type full email and press Enter to switch
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto border-t">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSwitchUser(user.email)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {user.displayName || 'No name'}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <div className="text-xs text-gray-400">{user.role}</div>
              </div>
            </button>
          ))}
          
          {!searchTerm.startsWith('/su ') && filteredUsers.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No users found
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-50 rounded-b-lg">
          <div className="text-xs text-gray-600">
            💡 Tips: Type "/su email" for direct switch • Press Escape to close
          </div>
        </div>
      </div>
    </div>
  );
}