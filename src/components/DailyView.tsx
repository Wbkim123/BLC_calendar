// src/components/DailyView.tsx
import React, { useState } from 'react';
import { DailySchedule, UserRole, TrainingEvent } from '../types/schedule';

interface Props {
  schedule: DailySchedule;
  role: UserRole;
  onBack: () => void;
  onSave: (dateStr: string, updatedEvent: TrainingEvent) => void;
  locations: string[];
  uniforms: string[];
  onAddLocation: (loc: string) => void;
  onAddUniform: (uni: string) => void;
}

export default function DailyView({ schedule, role, onBack, onSave, locations, uniforms, onAddLocation, onAddUniform }: Props) {
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
          locations={locations}
          uniforms={uniforms}
          onAddLocation={onAddLocation}
          onAddUniform={onAddUniform}
        />
      )}
    </div>
  );
}

// ---- 수정 모달 컴포넌트 ----
function EditModal({ 
  event, 
  onClose, 
  onSave, 
  locations, 
  uniforms, 
  onAddLocation, 
  onAddUniform 
}: { 
  event: TrainingEvent, 
  onClose: () => void, 
  onSave: (e: TrainingEvent) => void,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-blue-900 p-4 text-white">
          <h3 className="font-bold text-lg">Edit Event</h3>
        </div>
        
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
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

        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl active:bg-gray-300">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl active:bg-blue-800 shadow-md">Save Changes</button>
        </div>
      </div>
    </div>
  );
}