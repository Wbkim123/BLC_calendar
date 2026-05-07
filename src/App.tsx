// src/App.tsx
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Calendar from './components/Calendar';
import DailyView from './components/DailyView';
import { DailySchedule, UserRole, TrainingEvent } from './types/schedule';
import { mockSchedules } from './data/mockData';
import { db } from './firebase';
import { ref, onValue, set, update } from 'firebase/database';

function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [uniforms, setUniforms] = useState<string[]>([]);
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Firebase에서 실시간 데이터 불러오기
  useEffect(() => {
    const schedulesRef = ref(db, 'schedules');
    const locationsRef = ref(db, 'locations');
    const uniformsRef = ref(db, 'uniforms');

    // 스케줄 감시
    const unsubSchedules = onValue(schedulesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSchedules(data);
      } else {
        // 데이터가 없으면 초기값(mockData)으로 설정
        set(schedulesRef, mockSchedules);
      }
      setIsLoading(false);
    });

    // 위치 데이터 감시
    const unsubLocations = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLocations(data);
      } else {
        const defaultLocs = ['MPR', 'CR', 'DFC', 'AUD', 'ACA', 'FLD', 'HMP'];
        set(locationsRef, defaultLocs);
      }
    });

    // 복장 데이터 감시
    const unsubUniforms = onValue(uniformsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUniforms(data);
      } else {
        const defaultUnis = ['PT', 'ACU', 'ASU'];
        set(uniformsRef, defaultUnis);
      }
    });

    return () => {
      unsubSchedules();
      unsubLocations();
      unsubUniforms();
    };
  }, []);

  // 로그인 시 오늘 날짜 자동 선택
  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const hasSchedule = schedules.some(s => s.date === todayStr);
      if (hasSchedule) {
        setSelectedDateId(todayStr);
      }
    }
  };

  // 새로운 위치 추가 함수 (Firebase에 직접 반영)
  const addLocation = (loc: string) => {
    if (loc && !locations.includes(loc)) {
      set(ref(db, 'locations'), [...locations, loc]);
    }
  };

  // 새로운 복장 추가 함수 (Firebase에 직접 반영)
  const addUniform = (uni: string) => {
    if (uni && !uniforms.includes(uni)) {
      set(ref(db, 'uniforms'), [...uniforms, uni]);
    }
  };

  // 관리자가 이벤트를 수정했을 때 호출되는 함수 (Firebase 업데이트)
  const handleSaveEvent = (dateStr: string, updatedEvent: TrainingEvent) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const eventIndex = schedules[dayIndex].events.findIndex(ev => ev.id === updatedEvent.id);
      if (eventIndex !== -1) {
        // 특정 경로의 데이터만 업데이트
        const updates: any = {};
        updates[`/schedules/${dayIndex}/events/${eventIndex}`] = updatedEvent;
        update(ref(db), updates);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-blue-900 text-white font-bold">
        Loading Data...
      </div>
    );
  }

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