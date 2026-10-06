import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
  const location = useLocation();
  const [showInput, setShowInput] = useState(false);
  const [inputVal, setInputVal] = useState(localStorage.getItem('userId') || '');

  const userId = localStorage.getItem('userId');

  const saveUser = () => {
    if (inputVal.trim()) {
      localStorage.setItem('userId', inputVal.trim());
      setShowInput(false);
      window.location.reload();
    }
  };

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
        location.pathname === to
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:text-indigo-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">⚡ SALESTORM</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2">
          {navLink('/', 'Products')}
          {navLink('/orders', 'My Orders')}
        </div>

        {/* User ID */}
        <div className="flex items-center gap-2">
          {showInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Paste your User ID"
                className="text-xs border border-gray-300 rounded px-2 py-1 w-60 focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={saveUser}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              >
                Save
              </button>
              <button onClick={() => setShowInput(false)} className="text-xs text-gray-500 hover:text-gray-700">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="text-xs border border-gray-300 rounded px-3 py-1 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              {userId ? `User: ${userId.slice(0, 8)}…` : 'Set User ID'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
