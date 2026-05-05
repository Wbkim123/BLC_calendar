// src/App.tsx
import React, { useState } from 'react';
import Login from './components/Login';
import Calendar from './components/Calendar';
import DailyView from './components/DailyView';
import { DailySchedule, UserRole, TrainingEvent } from './types/schedule';
import { mockSchedules } from './data/mockData';

function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [schedules, setSchedules] = useState<DailySchedule[]>(mockSchedules); // 캘린더 전체 데이터 상태
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);

  // 관리자가 이벤트를 수정했을 때 호출되는 함수
  const handleSaveEvent = (dateStr: string, updatedEvent: TrainingEvent) => {
    setSchedules(prevSchedules => 
      prevSchedules.map(day => {
        if (day.date === dateStr) {
          return {
            ...day,
            events: day.events.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev)
          };
        }
        return day;
      })
    );
  };

  if (!role) {
    return <Login setRole={setRole} />;
  }

  const selectedSchedule = schedules.find(s => s.date === selectedDateId);

  if (selectedSchedule) {
    return (
      <DailyView 
        schedule={selectedSchedule} 
        role={role}
        onBack={() => setSelectedDateId(null)}
        onSave={handleSaveEvent}
      />
    );
  }

  return <Calendar schedules={schedules} onSelectDate={(date) => setSelectedDateId(date)} />;
}

export default App;