// src/components/Calendar.tsx
import React, { useState } from 'react';
import { DailySchedule } from '../types/schedule';

interface Props {
  schedules: DailySchedule[];
  onSelectDate: (date: string) => void;
}

export default function Calendar({ schedules, onSelectDate }: Props) {
  // 현재 보고 있는 달 (초기값은 스케줄의 첫 날짜 기준)
  const [viewDate, setViewDate] = useState(() => {
    if (schedules.length > 0) return new Date(schedules[0].date);
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

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

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-gray-100 p-4 lg:p-6 font-sans flex flex-col overflow-hidden">
      {/* 상단 헤더 */}
      <div className="bg-blue-900 text-white rounded-xl p-4 lg:p-6 mb-3 lg:mb-4 shadow-lg text-center">
        <div className="flex items-center justify-center gap-3 lg:gap-4 mb-1">
          <img src="/NCOA_Logo.png" alt="NCOA Logo" className="w-8 h-8 lg:w-12 lg:h-12 object-contain" />
          <h2 className="text-xl lg:text-3xl font-black tracking-wider">BLC CLASS 06-26</h2>
        </div>
        <p className="text-blue-200 text-xs lg:text-sm font-medium uppercase tracking-widest">Cycle Calendar</p>
      </div>

      {/* 달력 컨트롤 */}
      <div className="bg-white rounded-xl shadow-sm p-3 lg:p-6 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4 lg:mb-6">
          <button onClick={() => changeMonth(-1)} className="p-2 lg:p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="text-lg lg:text-2xl font-black text-blue-900 tracking-tight">
            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
          </h3>
          <button onClick={() => changeMonth(1)} className="p-2 lg:p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-2 lg:mb-3">
          {dayLabels.map(label => (
            <div key={label} className={`text-center text-[10px] lg:text-xs font-black ${label === 'SUN' ? 'text-red-500' : label === 'SAT' ? 'text-blue-500' : 'text-gray-400'}`}>
              {label}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 lg:gap-2 flex-1 min-h-0">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="h-full" />;
            
            const schedule = isScheduled(day);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return (
              <button
                key={day}
                onClick={() => schedule && onSelectDate(schedule.date)}
                disabled={!schedule}
                className={`h-full rounded-lg lg:rounded-xl flex flex-col items-center justify-center relative transition-all border-2 ${
                  schedule 
                    ? 'bg-blue-50 text-blue-900 font-bold border-blue-100 active:scale-95 hover:bg-blue-100' 
                    : 'text-gray-300 pointer-events-none border-transparent'
                } ${isToday ? 'ring-2 ring-blue-900 ring-offset-1' : ''}`}
              >
                <span className="text-sm lg:text-xl">{day}</span>
                {schedule && (
                  <span className="text-[8px] lg:text-[10px] font-black text-blue-500 mt-1 leading-none">
                    {schedule.dayLabel.split(' ')[0]}
                  </span>
                )}
                {schedule && (
                  <div className="absolute top-1 right-1 lg:top-2 lg:right-2 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-yellow-500 rounded-full shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 lg:mt-4 p-2 lg:p-4 bg-blue-50 rounded-lg lg:rounded-xl flex items-start gap-2 border border-blue-100">
        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-[10px] lg:text-xs text-blue-700 font-medium leading-tight">
          Dates with <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mx-0.5" /> mark scheduled training days. Tap any highlighted date to view details.
        </p>
      </div>
    </div>
  );
}