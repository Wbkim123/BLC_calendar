// src/components/Login.tsx
import React, { useState } from 'react';

interface Props {
  onLogin: (code: string, rememberLogin: boolean) => boolean;
}

export default function Login({ onLogin }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);

  const handleEnter = () => {
    if (onLogin(code, rememberLogin)) {
      setError(false);
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="app-safe-screen w-screen flex flex-col items-center justify-center bg-blue-900 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-sm text-center my-4">
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
        
        {error && <p className="text-red-500 text-sm mb-4 font-bold">Invalid code or inactive cycle.</p>}

        <button 
          onClick={handleEnter}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          ENTER
        </button>
      </div>
      <a
        href="/privacy.html"
        className="mt-3 text-xs font-bold text-blue-100 underline underline-offset-4"
      >
        Privacy Policy
      </a>
    </div>
  );
}
