import { DailySchedule } from '../../types/schedule';

export const chooseAutoTvSchedule = (
  schedules: DailySchedule[], today: string, now: number,
  getEnd: (schedule: DailySchedule) => Date | null
): DailySchedule | undefined => {
  const ordered = [...schedules].sort((a, b) => a.date.localeCompare(b.date));
  return ordered.find(schedule => {
    if (schedule.date > today) return true;
    if (schedule.date < today) return false;
    const end = getEnd(schedule);
    return !end || end.getTime() >= now;
  }) || ordered[ordered.length - 1];
};

export const chooseTvSchedule = (
  schedules: DailySchedule[], today: string, selectedDate?: string | null
): DailySchedule | undefined => {
  const ordered = [...schedules].sort((a, b) => a.date.localeCompare(b.date));
  return ordered.find(schedule => schedule.date === selectedDate)
    || ordered.find(schedule => schedule.date >= today)
    || ordered[ordered.length - 1];
};
