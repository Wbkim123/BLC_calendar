// src/components/Login.tsx
import React, { useState } from 'react';

interface Props {
  onLogin: (code: string, rememberLogin: boolean) => void;
}

export default function Login({ onLogin }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);

  const handleEnter = () => {
    if (code === '2002' || code === '8520' || code === '0987') {
      onLogin(code, rememberLogin);
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col items-center justify-center bg-blue-900 p-6 overflow-hidden">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/NCOA_Logo.png" alt="NCOA Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-black text-blue-900">NCOA BLC</h1>
        </div>
        <p className="text-gray-500 mb-6 font-medium">Schedule Manager</p>
        
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEnter();
            }
          }}
          placeholder="Enter Access Code"
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 mb-4 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-gray-600">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(e) => setRememberLogin(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
          />
          KEEP LOGIN
        </label>
        
        {error && <p className="text-red-500 text-sm mb-4 font-bold">Invalid code. Try again.</p>}

        <button 
          onClick={handleEnter}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          ENTER
        </button>
      </div>
    </div>
  );
}
