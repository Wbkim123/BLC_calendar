// src/components/Calendar.tsx
import React, { ReactNode, useRef, useState } from 'react';
import { DailySchedule, UserRole } from '../types/schedule';
import type { DisplayMode } from '../App';
import AdMobBanner from './AdMobBanner';
import { AcademyId } from '../types/academy';
import EventSearchModal from '../features/event-search/EventSearchModal';
import { EventSearchResult } from '../features/event-search/searchEvents';
import { getScheduleConflicts } from '../features/schedule-conflicts/conflicts';
import type { CrossAcademyConflictCheckStatus, CrossAcademyConflictNotice } from '../features/schedule-conflicts/notices';
import {
  getConflictPairKey,
  getDismissedConflictKeys
} from '../features/schedule-conflicts/dismissals';

export { hasCrossAcademyLocationConflict, hasScheduleConflict } from '../features/schedule-conflicts/conflicts';

interface Props {
  schedules: DailySchedule[];
  crossAcademySchedules?: DailySchedule[];
  crossAcademyConflictNotices?: CrossAcademyConflictNotice[];
  crossAcademyConflictCheckStatus?: CrossAcademyConflictCheckStatus;
  showCrossAcademyConflicts?: boolean;
  academy: AcademyId;
  currentCycleName?: string | null;
  onSelectDate: (date: string) => void;
  onSelectSearchResult: (result: EventSearchResult) => void;
  role?: UserRole;
  cycleTitle?: string;
  onUpdateCycleTitle?: (title: string) => void;
  onOpenImport?: () => void;
  settingsControl: ReactNode;
  notificationControl?: ReactNode;
  showAdBanner?: boolean;
  testMode?: boolean;
  displayMode: DisplayMode;
}

const getCalendarDayLabel = (dayLabel: string) =>
  /^FEDERAL\s+HOLIDAY\b/i.test(dayLabel.trim())
    ? 'HOLIDAY'
    : dayLabel.split(' ').slice(0, 2).join(' ');

export default function Calendar({ 
  schedules, 
  crossAcademySchedules = [],
  crossAcademyConflictNotices = [],
  crossAcademyConflictCheckStatus = 'idle',
  showCrossAcademyConflicts = false,
  academy,
  currentCycleName,
  onSelectDate, 
  onSelectSearchResult,
  role, 
  cycleTitle = "BLC CLASS", 
  onUpdateCycleTitle,
  onOpenImport,
  settingsControl,
  notificationControl,
  showAdBanner = true,
  testMode = false,
  displayMode
}: Props) {
  // 현재 보고 있는 달 (초기값은 오늘 날짜 기준)
  const [viewDate, setViewDate] = useState(new Date());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(cycleTitle);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // 현재 데이터에 존재하는 기수(Cycle) 목록 추출

  // 달력 계산 로직
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = [];
  // 이전 달 빈칸
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  // 이번 달 날짜
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const handleCalendarTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCalendarTouchEnd = (e: React.TouchEvent) => {
    const touchStart = touchStartRef.current;
    touchStartRef.current = null;
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0];
    const distanceX = touchEnd.clientX - touchStart.x;
    const distanceY = touchEnd.clientY - touchStart.y;
    const minSwipeDistance = 70;

    if (Math.abs(distanceX) < minSwipeDistance || Math.abs(distanceX) <= Math.abs(distanceY)) return;

    changeMonth(distanceX < 0 ? 1 : -1);
  };

  const isScheduled = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.find(s => s.date === dateStr);
  };

  const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const handleTitleUpdate = () => {
    if (onUpdateCycleTitle) {
      onUpdateCycleTitle(newTitle);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className={`app-safe-screen calendar-root bg-gray-100 p-3 lg:p-10 font-sans flex flex-col items-center justify-start lg:justify-center overflow-y-auto ${displayMode === 'tv' ? 'display-mode-tv' : ''}`}>
      {/* 내부 컨테이너 (데스크탑에서 넓이 및 높이 제한으로 비율 조정) */}
      <div className="calendar-container w-full h-auto lg:max-w-5xl flex flex-col lg:h-[800px] relative">
        
        {/* 상단 헤더 - 높이 축소 */}
        <div className="calendar-header relative bg-blue-900 text-white rounded-xl py-2 px-4 lg:py-4 lg:px-8 mb-2 lg:mb-4 shadow-lg text-center flex flex-col items-center shrink-0">
          <div className={`flex items-center justify-center gap-3 lg:gap-5 w-full relative ${notificationControl ? 'pr-10' : ''}`}>
            <img src="/NCOA_Logo.png" alt="NCOA Logo" className="w-8 h-8 lg:w-12 lg:h-12 object-contain" />
            {isEditingTitle ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-blue-800 text-white text-xl lg:text-4xl font-black tracking-wider px-2 py-1 rounded outline-none border-2 border-blue-400"
                  autoFocus
                />
                <button onClick={handleTitleUpdate} className="bg-green-600 px-3 py-1 rounded font-bold text-xs">SAVE</button>
                <button onClick={() => setIsEditingTitle(false)} className="bg-gray-600 px-3 py-1 rounded font-bold text-xs">CANCEL</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-4xl font-black tracking-wide lg:tracking-wider truncate">{cycleTitle}</h2>
                {role === 'ADMIN' && onUpdateCycleTitle && (
                  <button 
                    onClick={() => {
                      setNewTitle(cycleTitle);
                      setIsEditingTitle(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-700 rounded hover:bg-blue-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                )}
              </div>
            )}

            {/* 관리자 전용 버튼들 (좌측 상단) */}
          </div>
          <p className="text-blue-200 text-[10px] lg:text-sm font-medium uppercase tracking-widest">Cycle Calendar</p>
          {notificationControl && <div className="absolute right-2 top-1/2 -translate-y-1/2 lg:right-5">{notificationControl}</div>}
        </div>

        {/* 데이터 관리 패널 (ADMIN 전용) */}
        <div className={`mb-3 grid w-full items-stretch gap-2.5 ${role === 'ADMIN' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {role === 'ADMIN' && (
            <button
              onClick={onOpenImport}
              className="calendar-import-action flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              IMPORT
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="calendar-search-action flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            SEARCH
          </button>
        </div>
        {settingsControl}

        {/* 달력 본체 - 높이 확대 및 내부 패딩 조정 */}
        <div
          className="calendar-board bg-white rounded-xl lg:rounded-3xl shadow-sm p-3 lg:p-10 lg:flex-1 flex flex-col overflow-hidden min-h-0 border border-gray-200"
          onTouchStart={handleCalendarTouchStart}
          onTouchEnd={handleCalendarTouchEnd}
        >
          <div className="flex justify-between items-center mb-3 lg:mb-8 shrink-0">
            <button onClick={() => changeMonth(-1)} className="calendar-month-button p-2 lg:p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              <svg className="w-5 h-5 lg:w-8 lg:h-8 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h3 className="text-lg lg:text-4xl font-black text-blue-900 tracking-tight">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h3>
            <button onClick={() => changeMonth(1)} className="calendar-month-button p-2 lg:p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              <svg className="w-6 h-6 lg:w-8 lg:h-8 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2 lg:mb-4 shrink-0 border-b border-gray-100 pb-2">
            {dayLabels.map(label => (
              <div key={label} className={`text-center text-[10px] lg:text-sm font-black ${label === 'SUN' ? 'text-red-500' : label === 'SAT' ? 'text-blue-500' : 'text-gray-400'}`}>
                {label}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="calendar-days-grid grid grid-cols-7 gap-1.5 lg:gap-3.5 lg:auto-rows-fr lg:flex-1 min-h-0">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="calendar-empty-day aspect-square lg:aspect-auto lg:h-full" />;
              
              const schedule = isScheduled(day);
              const cellDate = new Date(year, month, day);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isToday = cellDate.getTime() === today.getTime();
              const isPastScheduledDate = Boolean(schedule) && cellDate.getTime() < today.getTime();
              const canViewConflicts = role !== 'STUDENT';
              const dismissedConflictKeys = schedule
                ? getDismissedConflictKeys(schedule)
                : new Set<string>();
              const hasInternalConflict = Boolean(canViewConflicts && schedule
                && getScheduleConflicts(schedule).some(conflict => !dismissedConflictKeys.has(getConflictPairKey(conflict))));
              const hasCommanderLocationConflict = Boolean(canViewConflicts && schedule && showCrossAcademyConflicts
                && getScheduleConflicts(schedule, crossAcademySchedules, true).some(conflict =>
                  conflict.kind === 'location' && !dismissedConflictKeys.has(getConflictPairKey(conflict))));
              const hasLocationConflict = Boolean(canViewConflicts && schedule && (
                hasCommanderLocationConflict
                || (crossAcademyConflictCheckStatus === 'ready' && crossAcademyConflictNotices.some(notice => notice.date === schedule.date))
              ));
              const hasConflict = hasInternalConflict || hasLocationConflict;
              const conflictLabel = [
                hasInternalConflict ? 'Internal schedule conflict' : '',
                hasLocationConflict ? 'Cross-academy shared-location conflict' : ''
              ].filter(Boolean).join('; ');
              const hasHighlightedEvent = Boolean(schedule?.events?.some(event => event.highlighted));
              const hasStudentNotes = Boolean(schedule?.notes?.trim());
              const hasSglNotes = role !== 'STUDENT' && Boolean(schedule?.sglNotes?.trim());
              const hasHighlightedNotes = Boolean(
                schedule?.notesHighlighted
                || (role !== 'STUDENT' && schedule?.sglNotesHighlighted)
              );
              const hasRedHighlight = hasHighlightedEvent || hasHighlightedNotes;

              return (
                <div
                  key={day}
                  title={conflictLabel || undefined}
                  className={`calendar-day ${!schedule ? 'calendar-day-disabled' : ''} ${hasConflict ? 'calendar-day-conflict' : ''} ${hasLocationConflict && !hasInternalConflict ? 'calendar-day-location-only' : ''} ${isToday ? 'calendar-day-today' : ''} ${isPastScheduledDate ? 'calendar-day-past' : ''} aspect-square lg:aspect-auto lg:h-full rounded-lg lg:rounded-2xl flex flex-col items-center justify-center relative transition-all border-2 ${
                    hasInternalConflict
                      ? 'bg-red-50 text-red-900 font-bold border-red-400 active:scale-95 hover:bg-red-100 shadow-sm'
                      : hasLocationConflict
                      ? 'bg-orange-50 text-orange-950 font-bold border-orange-500 active:scale-95 hover:bg-orange-100 shadow-sm'
                      : schedule 
                      ? 'bg-blue-50 text-blue-900 font-bold border-blue-100 active:scale-95 hover:bg-blue-100 shadow-sm'
                      : 'text-gray-300 pointer-events-none border-transparent'
                  } ${isToday ? 'ring-2 lg:ring-4 ring-blue-900 ring-offset-1' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => schedule && onSelectDate(schedule.date)}
                    disabled={!schedule}
                    aria-label={schedule ? `${schedule.date}, ${schedule.dayLabel}${conflictLabel ? `, ${conflictLabel}` : ''}` : undefined}
                    className="absolute inset-0 h-full w-full rounded-lg lg:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
                  >
                    <span className={`absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-sm lg:text-2xl ${isPastScheduledDate ? 'calendar-past-text' : ''}`}>
                      {day}
                    </span>
                    {schedule && (
                      <span className={`absolute bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[8px] font-black leading-none text-blue-500 lg:bottom-2 lg:text-xs ${isPastScheduledDate ? 'calendar-past-text' : ''}`}>
                        {getCalendarDayLabel(schedule.dayLabel)}
                      </span>
                    )}
                    {(hasRedHighlight || hasStudentNotes || hasSglNotes) && (
                      <div className="pointer-events-none absolute left-1/2 top-1 z-20 flex -translate-x-1/2 items-center gap-1 lg:top-2 lg:gap-1.5">
                        {hasRedHighlight && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 shadow-sm lg:h-2.5 lg:w-2.5" aria-label="Contains highlighted content" />
                        )}
                        {hasStudentNotes && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm lg:h-2.5 lg:w-2.5" aria-label="Contains student notes" />
                        )}
                        {hasSglNotes && (
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-sm lg:h-2.5 lg:w-2.5" aria-label="Contains SGL notes" />
                        )}
                      </div>
                    )}
                    {hasLocationConflict && (
                      <span className="calendar-location-conflict-badge pointer-events-none absolute left-0.5 top-0.5 z-20 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-orange-300 bg-white text-orange-600 shadow-[0_1px_4px_rgba(124,45,18,0.22)] ring-1 ring-white/80 lg:left-2 lg:top-2 lg:h-7 lg:w-7" aria-hidden="true">
                        <svg className="h-3.5 w-3.5 lg:h-[18px] lg:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 21h16M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M11 21v-3h2v3" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 범례 */}
        <div className="calendar-info mt-2 lg:mt-4 p-2 lg:p-4 bg-blue-50 rounded-lg lg:rounded-2xl flex items-start gap-2 lg:gap-4 border border-blue-100 shrink-0">
          <svg className="w-5 h-5 lg:w-7 lg:h-7 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[10px] lg:text-lg text-blue-700 font-medium leading-tight">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600 mx-0.5 lg:h-3 lg:w-3" /> Highlighted content · <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mx-0.5 lg:h-3 lg:w-3" /> Student notes{role !== 'STUDENT' && <><span> · </span><span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500 mx-0.5 lg:h-3 lg:w-3" /> SGL notes</>}. Red dates mark conflicts within your section.
            {(showCrossAcademyConflicts || crossAcademyConflictCheckStatus !== 'idle') && <span className="ml-1 inline-flex items-center gap-1.5"><span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-orange-300 bg-white text-orange-600 shadow-sm lg:h-6 lg:w-6"><svg className="h-3 w-3 lg:h-4 lg:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 21h16M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M11 21v-3h2v3" /></svg></span>Orange building marks a cross-academy location conflict.</span>}
            {crossAcademyConflictCheckStatus === 'checking' && <span className="ml-1">Checking cross-academy locations…</span>}
            {crossAcademyConflictCheckStatus === 'unavailable' && <span className="ml-1 font-black text-red-800">Cross-academy location check unavailable. Conflicts could not be verified.</span>}
            {' '}Tap a scheduled date to view details.
          </p>
        </div>
        <AdMobBanner visible={showAdBanner} testMode={testMode} />
      </div>
      {isSearchOpen && (
        <EventSearchModal
          schedules={schedules}
          academy={academy}
          role={role}
          currentCycleName={currentCycleName}
          onClose={() => setIsSearchOpen(false)}
          onSelect={(result) => {
            setIsSearchOpen(false);
            onSelectSearchResult(result);
          }}
        />
      )}
    </div>
  );
}
