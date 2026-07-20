import React, { useMemo, useState } from 'react';
import type { DisplayMode } from '../App';
import { DailySchedule, UserRole } from '../types/schedule';
import NotificationPrompt from './NotificationPrompt';

interface Props {
  role: UserRole;
  cycleName?: string | null;
  schedules: DailySchedule[];
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
  onLogout: () => void;
  onOpenImport: () => void;
  onDeleteCycle: (cycleName: string) => void;
  onResetSchedules: () => void;
}

const Toggle = ({ enabled, onChange, label }: { enabled: boolean; onChange: () => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onChange}
    className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-green-600' : 'bg-gray-300'}`}
  >
    <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export default function GeneralSettings({
  role,
  cycleName,
  schedules,
  displayMode,
  onDisplayModeChange,
  darkMode,
  onDarkModeChange,
  onLogout,
  onOpenImport,
  onDeleteCycle,
  onResetSchedules
}: Props) {
  const [open, setOpen] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);
  const uniqueCycles = useMemo(() => Array.from(new Set(
    schedules.map(schedule => schedule.cycleName?.trim()).filter((value): value is string => Boolean(value))
  )).sort(), [schedules]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="settings-launcher fixed right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-blue-900 text-white shadow-xl active:bg-blue-800"
        aria-label="Open settings"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="settings-panel max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900">Settings</h2>
                <p className="text-xs font-bold text-gray-500">{role === 'ADMIN' ? 'Administrator' : role === 'VIEWER' ? 'SGL' : 'Student'}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full bg-gray-100 p-2 text-gray-600" aria-label="Close settings">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <section className="settings-card rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 text-xs font-black uppercase tracking-wider text-gray-500">Display View</div>
                <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1">
                  {(['auto', 'tv'] as DisplayMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => onDisplayModeChange(mode)}
                      className={`rounded-lg py-2 text-xs font-black ${displayMode === mode ? 'bg-blue-900 text-white shadow' : 'text-gray-500'}`}
                    >
                      {mode === 'auto' ? 'AUTO' : 'TV VIEW'}
                    </button>
                  ))}
                </div>
              </section>

              <section className="settings-card flex items-center justify-between rounded-2xl border border-gray-200 p-4">
                <div>
                  <div className="text-sm font-black text-gray-900">Notifications</div>
                  <div className="text-[11px] font-semibold text-gray-500">Schedule update alerts</div>
                </div>
                <NotificationPrompt role={role} cycleName={cycleName} variant="toggle" />
              </section>

              <section className="settings-card flex items-center justify-between rounded-2xl border border-gray-200 p-4">
                <div>
                  <div className="text-sm font-black text-gray-900">Dark Mode</div>
                  <div className="text-[11px] font-semibold text-gray-500">Use a darker app theme</div>
                </div>
                <Toggle enabled={darkMode} onChange={() => onDarkModeChange(!darkMode)} label="Dark mode" />
              </section>

              {role === 'ADMIN' && (
                <section className="settings-card rounded-2xl border border-red-200 p-4">
                  <button onClick={() => setShowDatabase(value => !value)} className="flex w-full items-center justify-between text-left">
                    <div>
                      <div className="text-sm font-black text-red-800">Cycle Database Management</div>
                      <div className="text-[11px] font-semibold text-gray-500">Import or remove schedule data</div>
                    </div>
                    <span className="text-xs font-black text-red-700">{showDatabase ? 'CLOSE' : 'OPEN'}</span>
                  </button>
                  {showDatabase && (
                    <div className="mt-4 space-y-3 border-t border-red-100 pt-4">
                      <button
                        onClick={() => { setOpen(false); onOpenImport(); }}
                        className="w-full rounded-xl bg-blue-900 py-3 text-xs font-black text-white"
                      >
                        IMPORT SCHEDULE
                      </button>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {uniqueCycles.map(cycle => (
                          <div key={cycle} className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
                            <span className="text-xs font-bold text-gray-700">Cycle {cycle}</span>
                            <button onClick={() => onDeleteCycle(cycle)} className="rounded-lg px-2 py-1 text-xs font-black text-red-700">DELETE</button>
                          </div>
                        ))}
                        {uniqueCycles.length === 0 && <p className="text-xs font-semibold text-gray-400">No cycle data found.</p>}
                      </div>
                      <button onClick={onResetSchedules} className="w-full rounded-xl bg-red-700 py-3 text-xs font-black text-white">
                        CLEAR ALL DATABASE
                      </button>
                    </div>
                  )}
                </section>
              )}

              <button onClick={onLogout} className="w-full rounded-2xl bg-gray-800 py-3 text-sm font-black text-white">
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
