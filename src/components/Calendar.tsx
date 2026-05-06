// src/components/Calendar.tsx
import React from 'react';
import { DailySchedule } from '../types/schedule';

interface Props {
  schedules: DailySchedule[];
  onSelectDate: (date: string) => void;
}

export default function Calendar({ schedules, onSelectDate }: Props) {
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="bg-blue-900 text-white rounded-xl p-6 mb-6 shadow-lg text-center flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/NCOA_Logo.png" alt="NCOA Logo" className="w-10 h-10 object-contain" />
          <h2 className="text-2xl font-black tracking-wider">BLC CLASS 06-26</h2>
        </div>
        <p className="text-blue-200 text-sm font-medium">Training Schedule</p>
      </div>
      
      <div className="space-y-3 pb-8">
        {schedules.map((daySchedule) => (
          <button
            key={daySchedule.date}
            onClick={() => onSelectDate(daySchedule.date)}
            className="w-full bg-white p-4 rounded-xl shadow-sm border-l-8 border-blue-800 flex justify-between items-center active:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">{daySchedule.dayLabel}</p>
              <p className="text-lg font-bold text-gray-900">{daySchedule.date}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full text-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}