import React, { useMemo, useState } from 'react';
import { AcademyId } from '../../types/academy';
import { DailySchedule, UserRole } from '../../types/schedule';
import { EventSearchResult, EventSearchScope, searchEvents } from './searchEvents';

type Props = {
  schedules: DailySchedule[];
  academy: AcademyId;
  role?: UserRole;
  currentCycleName?: string | null;
  onClose: () => void;
  onSelect: (result: EventSearchResult) => void;
};

export default function EventSearchModal({ schedules, academy, role, currentCycleName, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<EventSearchScope>('CURRENT_CYCLE');
  const canSearchAllCycles = role !== 'STUDENT';
  const results = useMemo(() => searchEvents({
    schedules,
    academy,
    query,
    scope: canSearchAllCycles ? scope : 'CURRENT_CYCLE',
    currentCycleName
  }), [schedules, academy, query, scope, canSearchAllCycles, currentCycleName]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Event search">
      <div className="event-search-modal flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="event-search-header flex items-center justify-between border-b border-gray-100 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-black text-gray-900">Search {academy} Events</h2>
            <p className="text-xs font-bold text-gray-500">Only schedules available to your account are searched.</p>
          </div>
          <button onClick={onClose} className="event-search-close rounded-full bg-gray-100 p-2 text-gray-600" aria-label="Close search">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search event name (e.g. WTT)" className="event-search-input w-full rounded-xl border-2 border-gray-300 bg-gray-100 py-3 pl-10 pr-4 font-bold outline-none focus:border-blue-700 focus:bg-white" />
          </div>
          {canSearchAllCycles && (
            <div className="event-search-scope grid grid-cols-2 rounded-xl bg-gray-100 p-1 text-xs font-black">
              <button onClick={() => setScope('CURRENT_CYCLE')} className={`event-search-scope-button rounded-lg py-2 ${scope === 'CURRENT_CYCLE' ? 'event-search-scope-active bg-white text-blue-800 shadow-sm' : 'text-gray-500'}`}>CURRENT CYCLE</button>
              <button onClick={() => setScope('ALL_CYCLES')} className={`event-search-scope-button rounded-lg py-2 ${scope === 'ALL_CYCLES' ? 'event-search-scope-active bg-white text-blue-800 shadow-sm' : 'text-gray-500'}`}>ALL CYCLES</button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-5">
          {!query.trim() ? (
            <div className="py-12 text-center text-sm font-bold text-gray-400">Enter an event name to search.</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-sm font-bold text-gray-400">No matching {academy} events found.</div>
          ) : (
            <div className="space-y-2 pb-4">
              <div className="text-xs font-black uppercase tracking-wider text-gray-400">{results.length} result{results.length === 1 ? '' : 's'}</div>
              {results.map(result => (
                <button key={`${result.date}-${result.event.id}`} onClick={() => onSelect(result)} className="event-search-result w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left active:bg-blue-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-blue-700">{result.date} · {result.dayLabel}</div>
                      <div className="mt-1 break-words text-sm font-black text-gray-900">{result.event.eventName}</div>
                    </div>
                    <span className="event-search-result-time shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-gray-700">{result.event.displayTime || result.event.time}</span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-gray-500">{result.cycleName} · LOC: {result.event.location} · {academy === 'KTA' ? 'DUTY NCO' : 'UNI'}: {result.event.uniform}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
