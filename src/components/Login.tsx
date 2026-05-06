// src/components/Login.tsx
import React, { useState } from 'react';
import { UserRole } from '../types/schedule';

interface Props {
  setRole: (role: UserRole) => void;
}

export default function Login({ setRole }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleEnter = () => {
    if (code === '001') {
      setRole('ADMIN');
    } else if (code === '002') {
      setRole('VIEWER');
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-900 p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-3xl font-black text-blue-900 mb-2">NCOA BLC</h1>
        <p className="text-gray-500 mb-6 font-medium">Schedule Manager</p>
        
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
          placeholder="Enter Access Code"
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 mb-4 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
        />
        
        {error && <p className="text-red-500 text-sm mb-4 font-bold">Invalid code. Try 001 or 002.</p>}

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