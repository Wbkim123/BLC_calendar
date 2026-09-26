import React from 'react';
import { DailySchedule } from '../../types/schedule';

interface Props {
  schedules: DailySchedule[];
  cycle: string;
  automatic?: boolean;
  date?: string;
  onCycleChange: (cycle: string | null) => void;
  onDateChange: (date: string) => void;
  settings: React.ReactNode;
}

export default function TvScheduleControls({ schedules, cycle, automatic = false, date, onCycleChange, onDateChange, settings }: Props) {
  const cycles = Array.from(new Set(schedules.map(schedule => schedule.cycleName))).sort();
  const dates = Array.from(new Set(schedules.filter(schedule => schedule.cycleName === cycle).map(schedule => schedule.date))).sort();
  return (
    <div className="flex flex-wrap items-center gap-3 bg-blue-900 p-3 text-white">
      <span className="text-sm font-black">TV · EVENT VIEW</span>
      <label className="flex items-center gap-2 text-sm font-bold">
        Cycle
        <select className="rounded bg-blue-800 p-2" value={automatic ? '__AUTO_CYCLE__' : cycle} onChange={event => onCycleChange(event.target.value === '__AUTO_CYCLE__' ? null : event.target.value)} disabled={!cycles.length}>
          <option value="__AUTO_CYCLE__">AUTO{cycle ? ` · ${cycle}` : ''}</option>
          {cycles.map(value => <option key={value} value={value}>{value || 'Unassigned'}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        Date
        <select className="rounded bg-blue-800 p-2" value={date || ''} onChange={event => onDateChange(event.target.value)} disabled={!dates.length}>
          {!dates.length && <option value="">No schedules</option>}
          {dates.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="ml-auto">{settings}</div>
    </div>
  );
}
