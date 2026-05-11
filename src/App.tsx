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
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. Firebase에서 실시간 데이터 불러오기
  useEffect(() => {
    const schedulesRef = ref(db, 'schedules');
    const locationsRef = ref(db, 'locations');
    const uniformsRef = ref(db, 'uniforms');

    // 스케줄 감시
    const unsubSchedules = onValue(schedulesRef, (snapshot) => {
      console.log("Schedules snapshot received:", snapshot.val());
      const data = snapshot.val();
      if (data) {
        // Firebase might return an object if keys are non-sequential, ensure it's an array
        const schedulesArray = Array.isArray(data) ? data : Object.values(data);
        setSchedules(schedulesArray as DailySchedule[]);
        setIsLoading(false);
      } else {
        console.log("No schedules data, setting initial...");
        set(schedulesRef, mockSchedules)
          .then(() => setIsLoading(false))
          .catch(err => {
            console.error("Error setting initial schedules:", err);
            setApiError("Failed to initialize schedules: " + err.message);
            setIsLoading(false);
          });
      }
    }, (error) => {
      console.error("Schedules sync error:", error);
      setApiError("Permission denied or database error: " + error.message);
      setIsLoading(false);
    });

    // 위치 데이터 감시
    const unsubLocations = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const locsArray = Array.isArray(data) ? data : Object.values(data);
        setLocations(locsArray as string[]);
      } else {
        const defaultLocs = ['MPR', 'CR', 'DFC', 'AUD', 'ACA', 'FLD', 'HMP'];
        set(locationsRef, defaultLocs).catch(err => console.error("Error setting locations:", err));
      }
    });

    // 복장 데이터 감시
    const unsubUniforms = onValue(uniformsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unisArray = Array.isArray(data) ? data : Object.values(data);
        setUniforms(unisArray as string[]);
      } else {
        const defaultUnis = ['PT', 'ACU', 'ASU'];
        set(uniformsRef, defaultUnis).catch(err => console.error("Error setting uniforms:", err));
      }
    }, (error) => {
      console.error("Uniforms sync error:", error);
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
      set(ref(db, 'locations'), [...locations, loc]).catch(err => {
        alert("Failed to add location: " + err.message);
      });
    }
  };

  // 새로운 복장 추가 함수 (Firebase에 직접 반영)
  const addUniform = (uni: string) => {
    if (uni && !uniforms.includes(uni)) {
      set(ref(db, 'uniforms'), [...uniforms, uni]).catch(err => {
        alert("Failed to add uniform: " + err.message);
      });
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
        update(ref(db), updates).catch(err => {
          alert("Failed to save changes: " + err.message);
        });
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

  if (apiError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-900 text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">API Connection Error</h1>
        <p className="mb-6">{apiError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-red-900 px-6 py-2 rounded-lg font-bold"
        >
          RETRY
        </button>
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