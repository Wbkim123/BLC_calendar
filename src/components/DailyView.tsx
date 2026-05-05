// src/components/DailyView.tsx
import React, { useState } from 'react';
import { DailySchedule, UserRole, TrainingEvent } from '../types/schedule';

interface Props {
  schedule: DailySchedule;
  role: UserRole;
  onBack: () => void;
  onSave: (dateStr: string, updatedEvent: TrainingEvent) => void;
}

export default function DailyView({ schedule, role, onBack, onSave }: Props) {
  const [editingEvent, setEditingEvent] = useState<TrainingEvent | null>(null);

  const handleSave = (updated: TrainingEvent) => {
    onSave(schedule.date, updated);
    setEditingEvent(null); // 저장 후 모달 닫기
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      {/* 상단 헤더 */}
      <div className="bg-blue-900 text-white p-4 sticky top-0 shadow-md z-10 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 bg-blue-800 rounded-lg active:bg-blue-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-black">{schedule.date}</h1>
          <p className="text-sm text-blue-200">{schedule.dayLabel}</p>
        </div>
      </div>
      
      {/* 스케줄 리스트 */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-10">
        {schedule.events.map((ev) => (
          <div key={ev.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded mb-2">
                  {ev.time}
                </span>
                <p className="text-base font-bold text-gray-900 leading-tight mb-2">{ev.eventName}</p>
                <div className="flex gap-3 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1">📍 LOC: <span className="text-gray-800">{ev.location}</span></span>
                  <span className="flex items-center gap-1">👕 UNI: <span className="text-gray-800">{ev.uniform}</span></span>
                </div>
              </div>
              
              {/* 관리자에게만 보이는 ✏️ 수정 버튼 */}
              {role === 'ADMIN' && (
                <button 
                  onClick={() => setEditingEvent(ev)}
                  className="bg-blue-50 text-blue-700 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 수정 모달창 (editingEvent가 있을 때만 렌더링) */}
      {editingEvent && (
        <EditModal 
          event={editingEvent} 
          onClose={() => setEditingEvent(null)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
}

// ---- 수정 모달 컴포넌트 ----
function EditModal({ event, onClose, onSave }: { event: TrainingEvent, onClose: () => void, onSave: (e: TrainingEvent) => void }) {
  const [formData, setFormData] = useState<TrainingEvent>(event);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-blue-900 p-4 text-white">
          <h3 className="font-bold text-lg">Edit Event</h3>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">TIME</label>
            <input type="text" name="time" value={formData.time} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">EVENT NAME</label>
            <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">LOCATION (LOC)</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">UNIFORM (UNI)</label>
              <input type="text" name="uniform" value={formData.uniform} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl active:bg-gray-300">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl active:bg-blue-800 shadow-md">Save Changes</button>
        </div>
      </div>
    </div>
  );
}