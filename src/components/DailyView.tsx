// src/components/DailyView.tsx
import React, { useEffect, useRef, useState } from 'react';
import { DailySchedule, UserRole, TrainingEvent } from '../types/schedule';
import type { DisplayMode } from '../App';
import AdMobBanner from './AdMobBanner';

interface Props {
  schedule: DailySchedule;
  role: UserRole;
  onBack: () => void;
  onSave: (dateStr: string, updatedEvent: TrainingEvent) => void;
  onSaveNotes: (dateStr: string, notes: string) => void;
  onToggleNotesHighlight: (dateStr: string) => void;
  onSaveSglNotes: (dateStr: string, notes: string) => void;
  onToggleSglNotesHighlight: (dateStr: string) => void;
  onCreateEvent: (dateStr: string, newEvent: TrainingEvent) => void;
  onDeleteEvent: (dateStr: string, eventId: string) => void;
  locations: string[];
  uniforms: string[];
  onAddLocation: (loc: string) => void;
  onAddUniform: (uni: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  notificationHighlightTarget?: string | null;
  notificationChangeType?: string | null;
  notificationChangedFields?: string[];
  testMode?: boolean;
  displayMode: DisplayMode;
}

export default function DailyView({ 
  schedule, 
  role, 
  onBack, 
  onSave, 
  onSaveNotes,
  onToggleNotesHighlight,
  onSaveSglNotes,
  onToggleSglNotesHighlight,
  onCreateEvent,
  onDeleteEvent,
  locations, 
  uniforms, 
  onAddLocation, 
  onAddUniform,
  onPrev,
  onNext,
  notificationHighlightTarget,
  notificationChangeType,
  notificationChangedFields = [],
  testMode = false,
  displayMode
}: Props) {
  const [editingEvent, setEditingEvent] = useState<TrainingEvent | null>(null);
  const [editingNotes, setEditingNotes] = useState<'public' | 'sgl' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const highlightedTargetRef = useRef<HTMLDivElement>(null);
  const canViewSglNotes = role === 'ADMIN' || role === 'VIEWER';
  const scheduleDayName = (() => {
    const [year, month, day] = schedule.date.split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Date(year, month - 1, day)
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toUpperCase();
  })();

  useEffect(() => {
    if (!notificationHighlightTarget) return;
    const scrollTimer = window.setTimeout(() => {
      highlightedTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    return () => window.clearTimeout(scrollTimer);
  }, [notificationHighlightTarget]);

  // --- 스와이프 기능 구현 ---
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

  const minSwipeDistance = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && onNext) {
        onNext();
      } else if (isRightSwipe && onPrev) {
        onPrev();
      }
    }
  };
  // -------------------------

  const handleSave = (updated: TrainingEvent) => {
    if (isCreating) {
      onCreateEvent(schedule.date, updated);
      setIsCreating(false);
    } else {
      onSave(schedule.date, updated);
    }
    setEditingEvent(null);
  };

  const handleDelete = (eventId: string) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      onDeleteEvent(schedule.date, eventId);
      setEditingEvent(null);
    }
  };

  const openCreateModal = () => {
    const newEvent: TrainingEvent = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      time: "0900-1000",
      eventName: "",
      location: locations[0] || "MPR",
      uniform: uniforms[0] || "PT",
      highlighted: false
    };
    setEditingEvent(newEvent);
    setIsCreating(true);
  };

  // --- 시간순 정렬 및 겹침 감지 로직 ---
  const sortedEvents = [...(schedule.events || [])].sort((a, b) => a.time.localeCompare(b.time));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (displayMode !== 'tv') {
      setNow(new Date());
      return;
    }

    const refreshCurrentTime = () => setNow(new Date());
    refreshCurrentTime();
    const intervalId = window.setInterval(refreshCurrentTime, 15000);
    document.addEventListener('visibilitychange', refreshCurrentTime);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshCurrentTime);
    };
  }, [displayMode]);

  const getEventDate = (timeStr?: string) => {
    if (!timeStr) return null;
    const normalizedTime = timeStr.trim().padStart(4, '0');
    if (!/^\d{4}$/.test(normalizedTime)) return null;

    const [year, month, day] = schedule.date.split('-').map(Number);
    if (!year || !month || !day) return null;

    const eventDate = new Date(year, month - 1, day);
    eventDate.setHours(
      Number(normalizedTime.slice(0, 2)),
      Number(normalizedTime.slice(2, 4)),
      0,
      0
    );
    return eventDate;
  };

  const visibleEvents = displayMode === 'tv'
    ? sortedEvents.filter(event => {
        const [, endTimeStr] = event.time.split('-');
        const endTime = getEventDate(endTimeStr);
        return !endTime || now <= endTime;
      })
    : sortedEvents;

  // 각 이벤트가 충돌하는지 여부를 판단하는 함수
  const checkConflict = (idx: number) => {
    if (sortedEvents.length <= 1) return false;
    
    const curr = sortedEvents[idx];
    const [currStart, currEnd] = curr.time.split('-').map(t => parseInt(t));

    // 이전 이벤트와 겹치는지 확인
    if (idx > 0) {
      const prevEnd = parseInt(sortedEvents[idx - 1].time.split('-')[1]);
      if (currStart < prevEnd) return true;
    }

    // 다음 이벤트와 겹치는지 확인
    if (idx < sortedEvents.length - 1) {
      const nextStart = parseInt(sortedEvents[idx + 1].time.split('-')[0]);
      if (currEnd > nextStart) return true;
    }

    return false;
  };

  const hasGlobalConflict = sortedEvents.some((_, idx) => {
    if (idx === 0) return false;
    const prevEndTime = parseInt(sortedEvents[idx - 1].time.split('-')[1]);
    const currStartTime = parseInt(sortedEvents[idx].time.split('-')[0]);
    return currStartTime < prevEndTime;
  });

  return (
    <div 
      className={`app-safe-screen daily-screen bg-gray-100 flex flex-col relative ${displayMode === 'tv' ? 'display-mode-tv' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 상단 헤더 */}
      <div className="daily-header bg-blue-900 text-white p-3 sm:p-4 sticky top-0 shadow-md z-10 flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={onBack} className="mr-2 sm:mr-4 p-2 bg-blue-800 rounded-lg active:bg-blue-700 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <img src="/NCOA_Logo.png" alt="NCOA Logo" className="hidden sm:block w-10 h-10 object-contain mr-3 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black truncate">
              {schedule.date}{scheduleDayName ? ` (${scheduleDayName})` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 truncate">{schedule.dayLabel}</p>
          </div>
        </div>

        {/* 이전/다음 날짜 이동 버튼 */}
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <button 
            onClick={onPrev} 
            disabled={!onPrev}
            className={`p-2 rounded-lg ${onPrev ? 'bg-blue-800 active:bg-blue-700' : 'bg-blue-900 opacity-30 cursor-not-allowed'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={onNext} 
            disabled={!onNext}
            className={`p-2 rounded-lg ${onNext ? 'bg-blue-800 active:bg-blue-700' : 'bg-blue-900 opacity-30 cursor-not-allowed'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      
      {/* 스케줄 리스트 */}
      <div className={`daily-content flex-1 p-3 sm:p-4 space-y-3 overflow-y-auto ${
        role === 'ADMIN' ? 'daily-content-admin' : ''
      }`}>
        {notificationChangeType && (
          <div
            ref={notificationHighlightTarget === 'day' ? highlightedTargetRef : undefined}
            className={`rounded-xl border-2 border-blue-500 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900 shadow-sm ${
            notificationHighlightTarget === 'day' ? 'notification-change-highlight' : ''
          }`}
          >
            Updated: {notificationChangeType}
          </div>
        )}

        {/* 시간 중복 경고 메시지 */}
        {hasGlobalConflict && (
          <div className="schedule-conflict-warning bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-2 rounded-r-lg flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-xs lg:text-sm text-yellow-800 font-bold">
              Conflict detected: Overlapping schedule.
            </p>
          </div>
        )}

        {notificationHighlightTarget === 'notes' && !schedule.notes && (
          <div
            ref={highlightedTargetRef}
            className="notification-change-highlight rounded-xl border-2 border-blue-400 bg-blue-50 p-3 text-sm font-black text-blue-900"
          >
            NOTES changed: no notes for this day.
          </div>
        )}

        {notificationHighlightTarget === 'sglNotes' && canViewSglNotes && !schedule.sglNotes && (
          <div
            ref={highlightedTargetRef}
            className="notification-change-highlight rounded-xl border-2 border-purple-400 bg-purple-50 p-3 text-sm font-black text-purple-900"
          >
            SGL NOTES changed: no SGL-only notes for this day.
          </div>
        )}

        <div className="daily-main-layout space-y-3 lg:space-y-0">
        <div className="daily-events-grid space-y-3">
        {displayMode === 'tv' && sortedEvents.length > 0 && visibleEvents.length === 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-black text-blue-900">
            All events for this day are complete. Moving to the next schedule when available.
          </div>
        )}

        {visibleEvents.map((ev) => {
          // --- 현재 시각 기준 상태 계산 ---
          const [startTimeStr, endTimeStr] = ev.time.split('-');

          const startTime = getEventDate(startTimeStr);
          const endTime = getEventDate(endTimeStr);

          const isPast = endTime ? now > endTime : false;
          const isOngoing = Boolean(startTime && endTime && now >= startTime && now <= endTime);
          const sortedIndex = sortedEvents.findIndex(event => event.id === ev.id);
          const isConflicting = sortedIndex >= 0 ? checkConflict(sortedIndex) : false;
          // ----------------------------

          return (
            <div 
              key={ev.id} 
              ref={notificationHighlightTarget === `event:${ev.id}` ? highlightedTargetRef : undefined}
              className={`daily-event-card py-2 px-3 lg:py-3 lg:px-4 rounded-xl shadow-sm border-l-4 transition-colors relative ${
                notificationHighlightTarget === `event:${ev.id}` ? 'notification-change-highlight ' : ''
              }${
                isPast 
                  ? 'bg-gray-200 border-gray-400 opacity-60' 
                  : isOngoing 
                    ? 'bg-white border-green-500 ring-2 ring-green-100' 
                    : isConflicting
                      ? 'schedule-conflict-event bg-yellow-50 border-yellow-500 ring-2 ring-yellow-100'
                      : 'bg-white border-yellow-500'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0 pr-1 lg:pr-4">
                    <div className="daily-event-meta-row flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block px-2 py-0.5 text-[10px] lg:text-xs font-bold rounded ${
                        isOngoing ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'
                      } ${notificationHighlightTarget === `event:${ev.id}` && notificationChangedFields.includes('time') ? 'notification-field-highlight' : ''}`}>
                        {ev.time}
                      </span>
                      {isConflicting && <span className="text-sm animate-bounce" title="Time Conflict">⚠️</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] lg:text-xs font-bold text-gray-500 min-w-0">
                      <span className="flex items-center gap-1 min-w-0">📍 LOC: <span className={`${isPast ? 'text-gray-400' : 'text-gray-800'} truncate`}>{ev.location}</span></span>
                      <span className="flex items-center gap-1 min-w-0">👕 UNI: <span className={`${isPast ? 'text-gray-400' : 'text-gray-800'} truncate`}>{ev.uniform}</span></span>
                    </div>
                  </div>
                  {notificationHighlightTarget === `event:${ev.id}` && (
                    <div className="mb-1 flex flex-wrap gap-2 text-[10px] font-black">
                      {notificationChangedFields.includes('location') && (
                        <span className="notification-field-highlight px-1.5 py-0.5">LOC changed: {ev.location}</span>
                      )}
                      {notificationChangedFields.includes('uniform') && (
                        <span className="notification-field-highlight px-1.5 py-0.5">UNI changed: {ev.uniform}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-start gap-2 min-w-0">
                    {role === 'ADMIN' && (
                      <button
                        onClick={() => onSave(schedule.date, { ...ev, highlighted: !ev.highlighted })}
                        className={`mt-[-1px] text-lg leading-none transition-colors ${
                          ev.highlighted ? 'text-red-500 hover:text-red-600' : 'text-gray-300 hover:text-gray-400'
                        } ${notificationHighlightTarget === `event:${ev.id}` && notificationChangedFields.includes('highlighted') ? 'notification-field-highlight' : ''}`}
                        title={ev.highlighted ? "Remove highlight" : "Highlight event"}
                      >
                        ★
                      </button>
                    )}
                    <p className={`daily-event-title text-sm lg:text-base font-bold leading-tight break-words min-w-0 ${
                      ev.highlighted
                        ? 'text-red-600'
                        : isPast
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                    } ${notificationHighlightTarget === `event:${ev.id}` && notificationChangedFields.includes('eventName') ? 'notification-field-highlight' : ''}`}>
                      {ev.eventName}
                    </p>
                  </div>
                </div>
                
                {/* 관리자에게만 보이는 ✏️ 수정 버튼 */}
                {role === 'ADMIN' && (
                  <button 
                    onClick={() => {
                      setEditingEvent(ev);
                      setIsCreating(false);
                    }}
                    className="bg-blue-50 text-blue-700 p-1.5 lg:p-2 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>

        <div className="daily-notes-stack space-y-3">
        {schedule.notes && (
          <div
            ref={notificationHighlightTarget === 'notes' ? highlightedTargetRef : undefined}
            className={`daily-notes-panel daily-student-notes p-4 rounded-r-lg shadow-sm border-l-4 ${
            notificationHighlightTarget === 'notes' ? 'notification-change-highlight ' : ''
          }${
            schedule.notesHighlighted
              ? 'notes-highlighted bg-red-50 border-red-500 ring-2 ring-red-100'
              : 'bg-blue-50 border-blue-500'
          }`}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                {role === 'ADMIN' && (
                  <button
                    onClick={() => onToggleNotesHighlight(schedule.date)}
                    className={`text-lg leading-none transition-colors ${
                      schedule.notesHighlighted ? 'text-red-500' : 'text-blue-200 hover:text-red-400'
                    } ${notificationHighlightTarget === 'notes' && notificationChangedFields.includes('highlighted') ? 'notification-field-highlight' : ''}`}
                    title={schedule.notesHighlighted ? "Remove notes highlight" : "Highlight notes"}
                  >
                    ★
                  </button>
                )}
                <p className={`text-xs font-black ${schedule.notesHighlighted ? 'text-red-700' : 'text-blue-800'}`}>NOTES:</p>
              </div>
              {role === 'ADMIN' && (
                <button
                  onClick={() => setEditingNotes('public')}
                  className={`text-[10px] bg-white px-2 py-1 rounded-md font-black border hover:bg-blue-100 ${
                    schedule.notesHighlighted ? 'text-red-700 border-red-100' : 'text-blue-700 border-blue-100'
                  }`}
                >
                  Edit
                </button>
              )}
            </div>
            {notificationHighlightTarget === 'notes' && notificationChangedFields.includes('highlighted') && (
              <span className="notification-field-highlight mb-2 inline-block px-1.5 py-0.5 text-[10px] font-black">
                NOTES highlight changed
              </span>
            )}
            <p className={`daily-notes-text text-sm font-semibold leading-relaxed whitespace-pre-wrap ${
              schedule.notesHighlighted ? 'text-red-700' : 'text-gray-700'
            } ${notificationHighlightTarget === 'notes' && notificationChangedFields.includes('notes') ? 'notification-field-highlight p-1' : ''}`}>{schedule.notes}</p>
          </div>
        )}
        {canViewSglNotes && schedule.sglNotes && (
          <div
            ref={notificationHighlightTarget === 'sglNotes' ? highlightedTargetRef : undefined}
            className={`daily-notes-panel daily-sgl-notes p-4 rounded-r-lg shadow-sm border-l-4 ${
            notificationHighlightTarget === 'sglNotes' ? 'notification-change-highlight ' : ''
          }${
            schedule.sglNotesHighlighted
              ? 'notes-highlighted bg-purple-50 border-purple-600 ring-2 ring-purple-100'
              : 'bg-violet-50 border-violet-500'
          }`}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                {role === 'ADMIN' && (
                  <button
                    onClick={() => onToggleSglNotesHighlight(schedule.date)}
                    className={`text-lg leading-none transition-colors ${
                      schedule.sglNotesHighlighted ? 'text-purple-600' : 'text-violet-200 hover:text-purple-500'
                    } ${notificationHighlightTarget === 'sglNotes' && notificationChangedFields.includes('highlighted') ? 'notification-field-highlight' : ''}`}
                    title={schedule.sglNotesHighlighted ? "Remove SGL notes highlight" : "Highlight SGL notes"}
                  >
                    ★
                  </button>
                )}
                <p className={`text-xs font-black ${schedule.sglNotesHighlighted ? 'text-purple-800' : 'text-violet-800'}`}>SGL NOTES:</p>
              </div>
              {role === 'ADMIN' && (
                <button
                  onClick={() => setEditingNotes('sgl')}
                  className={`text-[10px] bg-white px-2 py-1 rounded-md font-black border hover:bg-violet-100 ${
                    schedule.sglNotesHighlighted ? 'text-purple-800 border-purple-100' : 'text-violet-700 border-violet-100'
                  }`}
                >
                  Edit
                </button>
              )}
            </div>
            {notificationHighlightTarget === 'sglNotes' && notificationChangedFields.includes('highlighted') && (
              <span className="notification-field-highlight mb-2 inline-block px-1.5 py-0.5 text-[10px] font-black">
                SGL NOTES highlight changed
              </span>
            )}
            <p className={`daily-notes-text text-sm font-semibold leading-relaxed whitespace-pre-wrap ${
              schedule.sglNotesHighlighted ? 'text-purple-800' : 'text-gray-700'
            } ${notificationHighlightTarget === 'sglNotes' && notificationChangedFields.includes('sglNotes') ? 'notification-field-highlight p-1' : ''}`}>{schedule.sglNotes}</p>
          </div>
        )}
        </div>
        </div>

        {role === 'ADMIN' && (
          <>
          {!schedule.notes && (
            <button
              onClick={() => setEditingNotes('public')}
              className="add-student-notes w-full py-2 px-3 lg:py-3 lg:px-4 border-2 border-dashed border-blue-200 rounded-xl flex items-center justify-center text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-[0.98] text-xs lg:text-sm font-black uppercase tracking-widest"
            >
              + Add Student Notes
            </button>
          )}
          {!schedule.sglNotes && (
            <button
              onClick={() => setEditingNotes('sgl')}
              className="add-sgl-notes w-full py-2 px-3 lg:py-3 lg:px-4 border-2 border-dashed border-purple-200 rounded-xl flex items-center justify-center text-purple-500 hover:border-purple-400 hover:bg-purple-50 transition-all active:scale-[0.98] text-xs lg:text-sm font-black uppercase tracking-widest"
            >
              + Add SGL Notes
            </button>
          )}
          <button 
            onClick={openCreateModal}
            className="w-full py-2 px-3 lg:py-3 lg:px-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98] text-xs lg:text-sm font-black uppercase tracking-widest"
          >
            <span className="text-2xl lg:text-3xl font-light leading-none">+</span>
            <span>Add Event</span>
          </button>
          </>
        )}
      </div>
      <AdMobBanner testMode={testMode} />

      {/* 수정 모달창 (editingEvent가 있을 때만 렌더링) */}
      {editingEvent && (
        <EditModal 
          event={editingEvent} 
          isCreating={isCreating}
          onClose={() => {
            setEditingEvent(null);
            setIsCreating(false);
          }} 
          onSave={handleSave} 
          onDelete={handleDelete}
          locations={locations}
          uniforms={uniforms}
          onAddLocation={onAddLocation}
          onAddUniform={onAddUniform}
        />
      )}
      {editingNotes && (
        <NotesModal
          title={editingNotes === 'sgl' ? 'Edit SGL Notes' : 'Edit Notes'}
          label={editingNotes === 'sgl' ? 'SGL NOTES:' : 'NOTES:'}
          placeholder={editingNotes === 'sgl' ? 'Notes visible only to SGL users and admins' : 'Optional notes for this day'}
          initialNotes={editingNotes === 'sgl' ? schedule.sglNotes || "" : schedule.notes || ""}
          onClose={() => setEditingNotes(null)}
          onSave={(notes) => {
            if (editingNotes === 'sgl') {
              onSaveSglNotes(schedule.date, notes);
            } else {
              onSaveNotes(schedule.date, notes);
            }
            setEditingNotes(null);
          }}
        />
      )}
    </div>
  );
}

// ---- 수정 모달 컴포넌트 ----
function NotesModal({
  title,
  label,
  placeholder,
  initialNotes,
  onClose,
  onSave
}: {
  title: string,
  label: string,
  placeholder: string,
  initialNotes: string,
  onClose: () => void,
  onSave: (notes: string) => void
}) {
  const [notes, setNotes] = useState(initialNotes);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="soft-modal bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="soft-modal-header bg-blue-900 p-4 text-white">
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        <div className="p-5">
          <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl active:bg-gray-300">Cancel</button>
          <button onClick={() => onSave(notes)} className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl active:bg-blue-800 shadow-md">
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ 
  event, 
  isCreating,
  onClose, 
  onSave, 
  onDelete,
  locations, 
  uniforms, 
  onAddLocation, 
  onAddUniform 
}: { 
  event: TrainingEvent, 
  isCreating: boolean,
  onClose: () => void, 
  onSave: (e: TrainingEvent) => void,
  onDelete: (id: string) => void,
  locations: string[],
  uniforms: string[],
  onAddLocation: (loc: string) => void,
  onAddUniform: (uni: string) => void
}) {
  const [formData, setFormData] = useState<TrainingEvent>(event);
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [showAddUni, setShowAddUni] = useState(false);
  const [newLoc, setNewLoc] = useState("");
  const [newUni, setNewUni] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddLocation = () => {
    if (newLoc.trim()) {
      onAddLocation(newLoc.trim());
      setFormData({ ...formData, location: newLoc.trim() });
      setNewLoc("");
      setShowAddLoc(false);
    }
  };

  const handleAddUniform = () => {
    if (newUni.trim()) {
      onAddUniform(newUni.trim());
      setFormData({ ...formData, uniform: newUni.trim() });
      setNewUni("");
      setShowAddUni(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 pt-4 z-50 backdrop-blur-sm overflow-y-auto"
      style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="soft-modal bg-white w-full max-w-sm max-h-full rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col">
        <div className="soft-modal-header bg-blue-900 p-4 text-white">
          <h3 className="font-bold text-lg">Edit Event</h3>
        </div>
        
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">TIME</label>
            <input type="text" name="time" value={formData.time} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">EVENT NAME</label>
            <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {/* LOCATION Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-500">LOCATION (LOC)</label>
              <button 
                onClick={() => setShowAddLoc(!showAddLoc)}
                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold"
              >
                {showAddLoc ? "Cancel" : "+ Add New"}
              </button>
            </div>
            {showAddLoc ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newLoc} 
                  onChange={(e) => setNewLoc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                  placeholder="New Location"
                  className="flex-1 border border-blue-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleAddLocation}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            ) : (
              <select 
                name="location" 
                value={formData.location} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
                {!locations.includes(formData.location) && (
                  <option value={formData.location}>{formData.location}</option>
                )}
              </select>
            )}
          </div>

          {/* UNIFORM Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-500">UNIFORM (UNI)</label>
              <button 
                onClick={() => setShowAddUni(!showAddUni)}
                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold"
              >
                {showAddUni ? "Cancel" : "+ Add New"}
              </button>
            </div>
            {showAddUni ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newUni} 
                  onChange={(e) => setNewUni(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUniform()}
                  placeholder="New Uniform"
                  className="flex-1 border border-blue-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleAddUniform}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            ) : (
              <select 
                name="uniform" 
                value={formData.uniform} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
              >
                {uniforms.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
                {!uniforms.includes(formData.uniform) && (
                  <option value={formData.uniform}>{formData.uniform}</option>
                )}
              </select>
            )}
          </div>

        </div>

        <div className="p-4 bg-gray-50 flex flex-col gap-3 shrink-0">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl active:bg-gray-300">Cancel</button>
            <button onClick={() => onSave(formData)} className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl active:bg-blue-800 shadow-md">
              {isCreating ? "Create Event" : "Save Changes"}
            </button>
          </div>
          {!isCreating && (
            <button 
              onClick={() => onDelete(event.id)}
              className="w-full py-2 text-red-600 font-bold text-sm hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
