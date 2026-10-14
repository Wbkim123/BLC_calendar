import React from 'react';
import NotificationPrompt from './NotificationPrompt';
import { UserRole } from '../types/schedule';
import { AcademyId } from '../types/academy';

interface Props {
  role: UserRole;
  academy: AcademyId;
  allAcademies: boolean;
  cycleName: string | null;
  testMode: boolean;
  onDismiss: () => void;
  onEnabled: () => void;
}

export default function NotificationOnboarding({ onDismiss, onEnabled, ...props }: Props) {
  return (
    <section aria-label="Enable notifications" className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[65] mx-auto max-h-[70vh] max-w-md overflow-y-auto rounded-2xl border border-green-200 bg-white p-3 shadow-2xl">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-gray-900">Enable Notifications</div>
          <div className="text-[11px] font-semibold text-gray-500">Get schedule update alerts on this device.</div>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification prompt"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-900">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </div>
      <NotificationPrompt {...props} autoPrompt={false} hideWhenGranted onStatusChange={status => { if (status === 'granted') onEnabled(); }} />
      <button type="button" onClick={onDismiss} className="mt-2 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700">Not now</button>
    </section>
  );
}
