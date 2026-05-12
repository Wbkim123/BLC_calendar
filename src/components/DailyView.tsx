// src/components/DailyView.tsx
import React, { useState } from 'react';
import { DailySchedule, UserRole, TrainingEvent } from '../types/schedule';

interface Props {
  schedule: DailySchedule;
  role: UserRole;
  onBack: () => void;
  onSave: (dateStr: string, updatedEvent: TrainingEvent) => void;
  onCreateEvent: (dateStr: string, newEvent: TrainingEvent) => void;
  onDeleteEvent: (dateStr: string, eventId: string) => void;
  locations: string[];
  uniforms: string[];
  onAddLocation: (loc: string) => void;
  onAddUniform: (uni: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function DailyView({ 
  schedule, 
  role, 
  onBack, 
  onSave, 
  onCreateEvent,
  onDeleteEvent,
  locations, 
  uniforms, 
  onAddLocation, 
  onAddUniform,
  onPrev,
  onNext 
}: Props) {
  const [editingEvent, setEditingEvent] = useState<TrainingEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
      setLongPressedId(null);
    }
  };

  const openCreateModal = () => {
    const newEvent: TrainingEvent = {
      id: Date.now().toString(),
      time: "0900-1000",
      eventName: "",
      location: locations[0] || "MPR",
      uniform: uniforms[0] || "PT"
    };
    setEditingEvent(newEvent);
    setIsCreating(true);
  };

  return (
    <div 
      className="min-h-screen bg-gray-100 flex flex-col relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 상단 헤더 */}
      <div className="bg-blue-900 text-white p-4 sticky top-0 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 bg-blue-800 rounded-lg active:bg-blue-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <img src="/NCOA_Logo.png" alt="NCOA Logo" className="w-10 h-10 object-contain mr-3" />
          <div>
            <h1 className="text-xl font-black">{schedule.date}</h1>
            <p className="text-sm text-blue-200">{schedule.dayLabel}</p>
          </div>
        </div>

        {/* 이전/다음 날짜 이동 버튼 */}
        <div className="flex gap-2">
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
      <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-10" onClick={() => setLongPressedId(null)}>
        {schedule.events.map((ev) => {
          // --- 현재 시각 기준 상태 계산 ---
          const now = new Date();
          const [startTimeStr, endTimeStr] = ev.time.split('-');
          
          const getEventDate = (timeStr: string) => {
            const [hours, mins] = [parseInt(timeStr.slice(0, 2)), parseInt(timeStr.slice(2, 4))];
            const d = new Date(schedule.date);
            d.setHours(hours, mins, 0, 0);
            return d;
          };

          const startTime = getEventDate(startTimeStr);
          const endTime = getEventDate(endTimeStr);

          const isPast = now > endTime;
          const isOngoing = now >= startTime && now <= endTime;
          // ----------------------------

          return (
            <div 
              key={ev.id} 
              className={`p-4 rounded-xl shadow-sm border-l-4 transition-colors relative ${
                isPast 
                  ? 'bg-gray-200 border-gray-400 opacity-60' 
                  : isOngoing 
                    ? 'bg-white border-green-500 ring-2 ring-green-100' 
                    : 'bg-white border-yellow-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                      isOngoing ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {ev.time}
                    </span>
                    {isOngoing && <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">● Ongoing</span>}
                    {isPast && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Completed</span>}
                  </div>
                  <p className={`text-base font-bold leading-tight mb-2 ${isPast ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {ev.eventName}
                  </p>
                  <div className="flex gap-3 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1">📍 LOC: <span className={isPast ? 'text-gray-400' : 'text-gray-800'}>{ev.location}</span></span>
                    <span className="flex items-center gap-1">👕 UNI: <span className={isPast ? 'text-gray-400' : 'text-gray-800'}>{ev.uniform}</span></span>
                  </div>
                </div>
                
                {/* 관리자에게만 보이는 ✏️ 수정 버튼 */}
                {role === 'ADMIN' && (
                  <button 
                    onClick={() => {
                      setEditingEvent(ev);
                      setIsCreating(false);
                    }}
                    className="bg-blue-50 text-blue-700 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* 새 일정 추가 버튼 박스 (관리자 전용) */}
        {role === 'ADMIN' && (
          <button 
            onClick={openCreateModal}
            className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98]"
          >
            <span className="text-4xl font-light">+</span>
          </button>
        )}
      </div>

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
    </div>
  );
}

// ---- 수정 모달 컴포넌트 ----
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

        <div className="p-4 bg-gray-50 flex flex-col gap-3">
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