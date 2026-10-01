import React, { useCallback, useEffect, useState } from 'react';

const LOGIN_STORAGE_KEY = 'blc_calendar_login';
const isTestLoginSaved = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOGIN_STORAGE_KEY) || 'null');
    return saved?.role === 'ADMIN' && (saved?.testMode === true || saved?.localEmulator === true);
  } catch {
    return false;
  }
};

export default function PhoneTestPreview({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(isTestLoginSaved);
  const [src, setSrc] = useState('');
  const syncSession = useCallback(() => {
    const next = isTestLoginSaved();
    setEnabled(next);
    if (next) {
      const url = new URL(window.location.href);
      url.searchParams.set('blcPhonePreviewFrame', '1');
      setSrc(`${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    syncSession();
    const onSessionChange = () => syncSession();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOGIN_STORAGE_KEY) return;
      if (event.newValue === null) window.location.reload();
      else syncSession();
    };
    window.addEventListener('ncoa-test-session-changed', onSessionChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('ncoa-test-session-changed', onSessionChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [syncSession]);

  const insidePreviewFrame = new URLSearchParams(window.location.search).get('blcPhonePreviewFrame') === '1';
  if (!enabled || insidePreviewFrame) return <>{children}</>;

  return (
    <main className="phone-test-preview" aria-label="Phone-sized test preview">
      <div className="phone-test-preview-label">Mobile test preview</div>
      <div className="phone-test-device">
        <div className="phone-test-screen">
          {src && <iframe title="Mobile app test preview" src={src} />}
        </div>
      </div>
    </main>
  );
}
