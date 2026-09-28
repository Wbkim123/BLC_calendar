// src/components/Login.tsx
import React, { useState } from 'react';

interface Props {
  onLogin: (code: string, rememberLogin: boolean) => Promise<boolean>;
  webOnly?: boolean;
  emulatorMode?: boolean;
}

export default function Login({ onLogin, webOnly = false, emulatorMode = false }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [showCode, setShowCode] = useState(false);

  const [busy, setBusy] = useState(false);

  const handleEnter = async () => {
    setBusy(true);
    if (await onLogin(code, rememberLogin)) {
      setError(false);
    } else {
      setError(true);
      setCode('');
    }
    setBusy(false);
  };

  return (
    <div className="login-screen app-safe-screen w-screen flex flex-col items-center justify-center bg-blue-900 p-4 sm:p-6 overflow-y-auto">
      <div className="login-card bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-sm text-center my-4">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/NCOA_Logo.png" alt="NCOA Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-black text-blue-900">NCOA</h1>
        </div>
        {emulatorMode ? (
          <p className="mb-4 text-sm font-semibold text-amber-800">Local Firebase emulator. Changes stay in test data; notifications are disabled.</p>
        ) : webOnly && code.trim() !== '318709' && (
          <p className="mb-4 text-sm text-gray-600">
            Website access is for TV displays and the owner. Students and staff, please use the mobile app.
          </p>
        )}
        <div className="relative mb-4">
          <input
            type={showCode ? 'text' : 'password'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEnter();
              }
            }}
            placeholder={emulatorMode ? 'Emulator test session' : 'Enter Access Code'}
            className="w-full border-2 border-gray-300 rounded-lg py-3 pl-12 pr-12 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowCode(current => !current)}
            disabled={busy}
            aria-label={showCode ? 'Hide access code' : 'Show access code'}
            aria-pressed={showCode}
            title={showCode ? 'Hide access code' : 'Show access code'}
            style={{ transform: 'translateY(-50%)' }}
            className="absolute right-1 top-1/2 flex h-10 w-10 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg aria-hidden="true" className="block h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" strokeWidth={2} />
              {showCode && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16" />}
            </svg>
          </button>
        </div>

        <label className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-gray-600">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(e) => setRememberLogin(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
          />
          Keep Login
        </label>
        
        {error && <p className="text-red-500 text-sm mb-4 font-bold">Invalid code or inactive cycle.</p>}

        <button 
          onClick={handleEnter}
          disabled={busy}
          className="primary-action w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          {busy ? 'VERIFYING...' : 'ENTER'}
        </button>
      </div>
      <a
        href="/privacy.html"
        className="mt-3 text-xs font-bold text-blue-600 underline underline-offset-4"
      >
        Privacy Policy
      </a>
    </div>
  );
}
