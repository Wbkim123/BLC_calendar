// src/components/Calendar.tsx
import React, { ReactNode, useRef, useState } from 'react';
import { DailySchedule, UserRole } from '../types/schedule';
import type { DisplayMode } from '../App';
import AdMobBanner from './AdMobBanner';

interface Props {
  schedules: DailySchedule[];
  onSelectDate: (date: string) => void;
  role?: UserRole;
  cycleTitle?: string;
  onUpdateCycleTitle?: (title: string) => void;
  onOpenImport?: () => void;
  settingsControl: ReactNode;
  showAdBanner?: boolean;
  displayMode: DisplayMode;
}

const hasScheduleConflict = (schedule: DailySchedule) => {
  const sortedEvents = [...(schedule.events || [])].sort((a, b) => a.time.localeCompare(b.time));

  return sortedEvents.some((event, index) => {
    if (index === 0) return false;

    const previousEnd = parseInt(sortedEvents[index - 1].time.split('-')[1]);
    const currentStart = parseInt(event.time.split('-')[0]);
    return currentStart < previousEnd;
  });
};

export default function Calendar({ 
  schedules, 
  onSelectDate, 
  role, 
  cycleTitle = "BLC CLASS", 
  onUpdateCycleTitle,
  onOpenImport,
  settingsControl,
  showAdBanner = true,
  displayMode
}: Props) {
  // 현재 보고 있는 달 (초기값은 오늘 날짜 기준)
  const [viewDate, setViewDate] = useState(new Date());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(cycleTitle);
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
        <div className="bg-blue-900 text-white rounded-xl py-2 px-4 lg:py-4 lg:px-8 mb-2 lg:mb-4 shadow-lg text-center flex flex-col items-center shrink-0">
          <div className="flex items-center justify-center gap-3 lg:gap-5 w-full relative">
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
        </div>

        {/* 데이터 관리 패널 (ADMIN 전용) */}
        <div className={`mb-2 flex w-full gap-2 ${role === 'ADMIN' ? '' : 'block'}`}>
          {role === 'ADMIN' && (
            <button
              onClick={onOpenImport}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-900 py-2 text-xs font-bold text-white shadow-md active:bg-blue-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              IMPORT
            </button>
          )}
          <div className={role === 'ADMIN' ? 'flex-1' : 'w-full'}>{settingsControl}</div>
        </div>

        {/* 달력 본체 - 높이 확대 및 내부 패딩 조정 */}
        <div
          className="calendar-board bg-white rounded-xl lg:rounded-3xl shadow-sm p-3 lg:p-10 lg:flex-1 flex flex-col overflow-hidden min-h-0 border border-gray-200"
          onTouchStart={handleCalendarTouchStart}
          onTouchEnd={handleCalendarTouchEnd}
        >
          <div className="flex justify-between items-center mb-3 lg:mb-8 shrink-0">
            <button onClick={() => changeMonth(-1)} className="p-2 lg:p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              <svg className="w-5 h-5 lg:w-8 lg:h-8 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h3 className="text-lg lg:text-4xl font-black text-blue-900 tracking-tight">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-2 lg:p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
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
          <div className="calendar-days-grid grid grid-cols-7 gap-1 lg:gap-3 lg:auto-rows-fr lg:flex-1 min-h-0">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="calendar-empty-day aspect-square lg:aspect-auto lg:h-full" />;
              
              const schedule = isScheduled(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              const hasConflict = schedule ? hasScheduleConflict(schedule) : false;

              return (
                <button
                  key={day}
                  onClick={() => schedule && onSelectDate(schedule.date)}
                  disabled={!schedule}
                  title={hasConflict ? 'Conflict detected: Overlapping schedule.' : undefined}
                  className={`calendar-day aspect-square lg:aspect-auto lg:h-full rounded-lg lg:rounded-2xl flex flex-col items-center justify-center relative transition-all border-2 ${
                    hasConflict
                      ? 'bg-red-50 text-red-900 font-bold border-red-400 active:scale-95 hover:bg-red-100 shadow-sm'
                      : schedule 
                      ? 'bg-blue-50 text-blue-900 font-bold border-blue-100 active:scale-95 hover:bg-blue-100 shadow-sm'
                      : 'text-gray-300 pointer-events-none border-transparent'
                  } ${isToday ? 'ring-2 lg:ring-4 ring-blue-900 ring-offset-1' : ''}`}
                >
                  <span className="text-sm lg:text-2xl">{day}</span>
                  {schedule && (
                    <span className="text-[8px] lg:text-xs font-black text-blue-500 mt-1 lg:mt-2 leading-none">
                      {schedule.dayLabel.split(' ').slice(0, 2).join(' ')}
                    </span>
                  )}
                  {schedule && (
                    hasConflict ? (
                      <div
                        className="absolute top-0.5 right-0.5 lg:top-2 lg:right-2 w-4 h-4 lg:w-7 lg:h-7 bg-red-600 text-white rounded-full shadow-sm flex items-center justify-center text-[10px] lg:text-base font-black"
                        aria-label="Schedule conflict"
                      >
                        !
                      </div>
                    ) : (
                      <div className="absolute top-1 right-1 lg:top-3 lg:right-3 w-1.5 h-1.5 lg:w-3 lg:h-3 bg-yellow-500 rounded-full shadow-sm" />
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 범례 */}
        <div className="mt-2 lg:mt-4 p-2 lg:p-4 bg-blue-50 rounded-lg lg:rounded-2xl flex items-start gap-2 lg:gap-4 border border-blue-100 shrink-0">
          <svg className="w-5 h-5 lg:w-7 lg:h-7 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[10px] lg:text-lg text-blue-700 font-medium leading-tight">
            Dates with <span className="inline-block w-2 h-2 lg:w-4 lg:h-4 bg-yellow-500 rounded-full mx-0.5" /> mark scheduled training days. A <span className="inline-flex w-3.5 h-3.5 lg:w-6 lg:h-6 bg-red-600 text-white rounded-full mx-0.5 items-center justify-center text-[9px] lg:text-sm font-black align-middle">!</span> indicates overlapping events. Tap a highlighted date to view details.
          </p>
        </div>
        <div className="py-2 text-center">
          <a
            href="/privacy.html"
            className="text-[10px] lg:text-xs font-bold text-gray-500 underline underline-offset-4"
          >
            Privacy Policy
          </a>
        </div>
        <AdMobBanner visible={showAdBanner} />
      </div>
    </div>
  );
}
