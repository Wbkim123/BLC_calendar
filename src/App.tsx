// src/App.tsx
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Calendar from './components/Calendar';
import DailyView from './components/DailyView';
import { DailySchedule, UserRole, TrainingEvent } from './types/schedule';
import { mockSchedules } from './data/mockData';

function App() {
  const [role, setRole] = useState<UserRole>(null);
  
  // 1. 초기 상태를 localStorage에서 불러오기 (없으면 mockData 사용)
  const [schedules, setSchedules] = useState<DailySchedule[]>(() => {
    const saved = localStorage.getItem('blc_schedules');
    return saved ? JSON.parse(saved) : mockSchedules;
  });

  const [locations, setLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('blc_locations');
    return saved ? JSON.parse(saved) : ['MPR', 'CR', 'DFC', 'AUD', 'ACA', 'FLD', 'HMP'];
  });

  const [uniforms, setUniforms] = useState<string[]>(() => {
    const saved = localStorage.getItem('blc_uniforms');
    return saved ? JSON.parse(saved) : ['PT', 'ACU', 'ASU'];
  });

  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);

  // 2. 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('blc_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('blc_locations', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('blc_uniforms', JSON.stringify(uniforms));
  }, [uniforms]);

  // 로그인 시 오늘 날짜 자동 선택
  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole) {
      // 오늘 날짜 구하기 (YYYY-MM-DD 형식)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      // 해당 날짜의 스케줄이 있는지 확인 후 선택
      const hasSchedule = schedules.some(s => s.date === todayStr);
      if (hasSchedule) {
        setSelectedDateId(todayStr);
      }
    }
  };

  // 새로운 위치/복장 추가 함수
  const addLocation = (loc: string) => {
    if (loc && !locations.includes(loc)) {
      setLocations([...locations, loc]);
    }
  };

  const addUniform = (uni: string) => {
    if (uni && !uniforms.includes(uni)) {
      setUniforms([...uniforms, uni]);
    }
  };

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
    return <Login setRole={handleSetRole} />;
  }

  const selectedSchedule = schedules.find(s => s.date === selectedDateId);

  if (selectedSchedule) {
    const currentIndex = schedules.findIndex(s => s.date === selectedDateId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < schedules.length - 1;

    const handlePrev = hasPrev ? () => setSelectedDateId(schedules[currentIndex - 1].date) : undefined;
    const handleNext = hasNext ? () => setSelectedDateId(schedules[currentIndex + 1].date) : undefined;

    return (
      <DailyView 
        schedule={selectedSchedule} 
        role={role}
        onBack={() => setSelectedDateId(null)}
        onSave={handleSaveEvent}
        locations={locations}
        uniforms={uniforms}
        onAddLocation={addLocation}
        onAddUniform={addUniform}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    );
  }

  return <Calendar schedules={schedules} onSelectDate={(date) => setSelectedDateId(date)} />;
}

export default App;