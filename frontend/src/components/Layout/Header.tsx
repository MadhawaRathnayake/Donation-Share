import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut, User } from 'lucide-react';

const Header = () => {
  const { isAuthenticated, login, logout, username, roles } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6">
      <div className="font-semibold text-gray-700">
        Dashboard
      </div>
      <div>
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} />
              <span>{username}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{roles[0] || 'User'}</span>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={login}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <LogIn size={16} /> Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
