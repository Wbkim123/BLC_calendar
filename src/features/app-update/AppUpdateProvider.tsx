import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { dismissalKey, parseRelease, shouldRemind, STORE_URLS, StorePlatform, UpdateRelease } from './policy';

interface AvailableUpdate extends UpdateRelease { platform: StorePlatform; }
const UpdateContext = createContext<AvailableUpdate | null>(null);

export function UpdateSettingsCard() {
  const update = useContext(UpdateContext);
  if (!update) return null;
  return <section className="settings-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
    <div className="text-sm font-black text-gray-900">App update available</div>
    <p className="mt-1 text-xs text-gray-600">Version {update.latestVersion} is ready to install.</p>
    <a className="mt-3 inline-block rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white" href={STORE_URLS[update.platform]} target="_blank" rel="noopener noreferrer">Update on {update.platform === 'ios' ? 'App Store' : 'Google Play'}</a>
  </section>;
}

export default function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [prompt, setPrompt] = useState(false);
  const dismissed = useRef(new Map<string, number>());
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (!Capacitor.isNativePlatform() || process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true' || (platform !== 'ios' && platform !== 'android')) return;
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    let checking = false;
    const check = async () => {
      if (checking || disposed) return;
      checking = true;
      try {
        const [{ App }, remote, { app }] = await Promise.all([import('@capacitor/app'), import('firebase/remote-config'), import('../../firebase')]);
        if (!await remote.isSupported() || disposed) return;
        const info = await App.getInfo();
        if (disposed) return;
        const config = remote.getRemoteConfig(app);
        config.settings.minimumFetchIntervalMillis = 60 * 60 * 1000;
        config.settings.fetchTimeoutMillis = 8000;
        // Fail open: an offline/failed check must never block schedule access.
        await remote.fetchAndActivate(config);
        if (disposed) return;
        const release = parseRelease(remote.getValue(config, `app_update_${platform}`).asString(), info.version);
        setUpdate(release ? { ...release, platform } : null);
        if (!release) { setPrompt(false); return; }
        const key = dismissalKey(platform, release.latestVersion);
        let last = dismissed.current.get(key) || 0;
        try { last = Math.max(last, Number(localStorage.getItem(key)) || 0); } catch { /* Session fallback. */ }
        setPrompt(shouldRemind(last));
      } catch { /* Optional guidance: preserve app access on network/plugin failures. */ }
      finally { checking = false; }
    };
    void check();
    void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void check(); });
      if (disposed) await listener.remove();
      else removeListener = () => listener.remove();
    }).catch(() => undefined);
    return () => { disposed = true; void removeListener?.(); };
  }, []);
  useEffect(() => {
    if (!prompt) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, [prompt]);
  const postpone = () => {
    if (update) {
      const key = dismissalKey(update.platform, update.latestVersion), now = Date.now();
      dismissed.current.set(key, now);
      try { localStorage.setItem(key, String(now)); } catch { /* Session fallback. */ }
    }
    setPrompt(false);
  };
  return <UpdateContext.Provider value={update}>
    {children}
    {prompt && update && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="app-update-title" aria-describedby="app-update-description"
        onKeyDown={event => {
          if (event.key === 'Escape') postpone();
          if (event.key === 'Tab') {
            const controls = event.currentTarget.querySelectorAll<HTMLElement>('a, button');
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }} className="w-full max-w-sm rounded-3xl bg-white p-6 text-gray-900 shadow-2xl">
        <div className="mb-4 text-sm font-bold text-blue-700">VERSION {update.latestVersion}</div>
        <h2 id="app-update-title" className="text-xl font-black">An update is available</h2>
        <p id="app-update-description" className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">{update.notes || 'Get the latest improvements to NCOA Schedule Calendar.'}</p>
        <a onClick={postpone} href={STORE_URLS[update.platform]} target="_blank" rel="noopener noreferrer" className="mt-6 block rounded-xl bg-blue-800 px-4 py-3 text-center font-bold text-white">Update on {update.platform === 'ios' ? 'App Store' : 'Google Play'}</a>
        <button ref={closeButton} onClick={postpone} className="mt-2 w-full rounded-xl px-4 py-3 font-semibold text-gray-600">Later</button>
      </section>
    </div>}
  </UpdateContext.Provider>;
}
