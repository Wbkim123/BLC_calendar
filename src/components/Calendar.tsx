// src/components/Calendar.tsx
import React, { useState } from 'react';
import { DailySchedule, UserRole } from '../types/schedule';

interface Props {
  schedules: DailySchedule[];
  onSelectDate: (date: string) => void;
  role?: UserRole;
  onLogout?: () => void;
  cycleTitle?: string;
  onUpdateCycleTitle?: (title: string) => void;
  onOpenImport?: () => void;
  onResetSchedules?: () => void;
  onDeleteCycle?: (cycleName: string) => void;
}

export default function Calendar({ 
  schedules, 
  onSelectDate, 
  role, 
  onLogout,
  cycleTitle = "BLC CLASS", 
  onUpdateCycleTitle,
  onOpenImport,
  onResetSchedules,
  onDeleteCycle
}: Props) {
  // 현재 보고 있는 달 (초기값은 오늘 날짜 기준)
  const [viewDate, setViewDate] = useState(new Date());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(cycleTitle);
  const [showManageData, setShowManageData] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // 현재 데이터에 존재하는 기수(Cycle) 목록 추출
  const uniqueCycles = Array.from(new Set(schedules.map(s => s.cycleName).filter(Boolean)));

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
    <div className="min-h-screen bg-gray-100 p-3 lg:p-10 font-sans flex flex-col items-center justify-center overflow-hidden">
      {/* 내부 컨테이너 (데스크탑에서 넓이 및 높이 제한으로 비율 조정) */}
      <div className="w-full h-auto lg:max-w-5xl flex flex-col lg:h-[800px] relative">
        
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
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl lg:text-4xl font-black tracking-wider">{cycleTitle}</h2>
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
            {onLogout && (
              <button
                onClick={onLogout}
                className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:flex bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-xs font-bold items-center gap-1 shadow-md transition-all"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                LOGOUT
              </button>
            )}

            {role === 'ADMIN' && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:flex gap-2">
                <button 
                  onClick={onOpenImport}
                  className="bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-all"
                  title="Import from PDF/Image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  IMPORT
                </button>
                <button 
                  onClick={() => setShowManageData(!showManageData)}
                  className={`${showManageData ? 'bg-gray-700' : 'bg-red-800 hover:bg-red-700'} px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-all`}
                  title="Manage Data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  MANAGE
                </button>
              </div>
            )}
          </div>
          <p className="text-blue-200 text-[10px] lg:text-sm font-medium uppercase tracking-widest">Cycle Calendar</p>
        </div>

        {/* 데이터 관리 패널 (ADMIN 전용) */}
        {role === 'ADMIN' && showManageData && (
          <div className="absolute right-0 top-20 bg-white border-2 border-red-100 rounded-2xl shadow-2xl p-6 z-50 w-72 animate-fade-in-up">
            <h4 className="font-black text-red-900 text-sm mb-4 border-b pb-2 uppercase tracking-tight">Manage Cycle Data</h4>
            
            <div className="space-y-4">
              {/* 기수별 삭제 */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase">Select Cycle to Delete</label>
                {uniqueCycles.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {uniqueCycles.map(cycle => (
                      <div key={cycle} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg group">
                        <span className="text-xs font-bold text-gray-700">{cycle}</span>
                        <button 
                          onClick={() => onDeleteCycle?.(cycle)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">No cycle tags found.</p>
                )}
              </div>

              {/* 전체 삭제 */}
              <div className="pt-2 border-t">
                <button 
                  onClick={onResetSchedules}
                  className="w-full bg-red-50 text-red-700 py-3 rounded-xl text-xs font-black hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  CLEAR ALL DATABASE
                </button>
              </div>
            </div>

            <button 
              onClick={() => setShowManageData(false)}
              className="mt-6 w-full py-2 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase"
            >
              Close
            </button>
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="lg:hidden w-full mb-2 bg-gray-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            LOGOUT
          </button>
        )}

        {/* 모바일 전용 관리자 버튼 */}
        {role === 'ADMIN' && (
          <div className="lg:hidden flex gap-2 mb-2 w-full">
            <button 
              onClick={onOpenImport}
              className="flex-1 bg-blue-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              IMPORT
            </button>
            <button 
              onClick={() => setShowManageData(!showManageData)}
              className="flex-1 bg-red-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              MANAGE
            </button>
          </div>
        )}

        {/* 달력 본체 - 높이 확대 및 내부 패딩 조정 */}
        <div className="bg-white rounded-xl lg:rounded-3xl shadow-sm p-3 lg:p-10 lg:flex-1 flex flex-col overflow-hidden min-h-0 border border-gray-200">
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
          <div className="grid grid-cols-7 gap-1 lg:gap-3 lg:auto-rows-fr lg:flex-1 min-h-0">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="aspect-square lg:aspect-auto lg:h-full" />;
              
              const schedule = isScheduled(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <button
                  key={day}
                  onClick={() => schedule && onSelectDate(schedule.date)}
                  disabled={!schedule}
                  className={`aspect-square lg:aspect-auto lg:h-full rounded-lg lg:rounded-2xl flex flex-col items-center justify-center relative transition-all border-2 ${
                    schedule 
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
                    <div className="absolute top-1 right-1 lg:top-3 lg:right-3 w-1.5 h-1.5 lg:w-3 lg:h-3 bg-yellow-500 rounded-full shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 범례 */}
        <div className="mt-2 lg:mt-6 p-2 lg:p-6 bg-blue-50 rounded-lg lg:rounded-2xl flex items-start gap-2 lg:gap-4 border border-blue-100 shrink-0 mb-1 lg:mb-0">
          <svg className="w-5 h-5 lg:w-7 lg:h-7 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[9px] lg:text-lg text-blue-700 font-medium leading-tight">
            Dates with <span className="inline-block w-2 h-2 lg:w-4 lg:h-4 bg-yellow-500 rounded-full mx-0.5" /> mark scheduled training days. Tap any highlighted date to view details.
          </p>
        </div>
      </div>
    </div>
  );
}
