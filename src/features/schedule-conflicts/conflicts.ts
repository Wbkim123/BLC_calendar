import { AcademyId } from '../../types/academy';
import { DailySchedule, TrainingEvent } from '../../types/schedule';

export type ScheduleConflict = {
  first: TrainingEvent;
  second: TrainingEvent;
  kind: 'time' | 'location';
  otherAcademy?: AcademyId;
};

const getTimeRange = (event: TrainingEvent) => {
  const [start, end] = event.time.split('-').map(Number);
  return Number.isFinite(start) && Number.isFinite(end) ? [start, end] as const : null;
};

export const eventsOverlapInTime = (first: TrainingEvent, second: TrainingEvent) => {
  const firstRange = getTimeRange(first);
  const secondRange = getTimeRange(second);
  return Boolean(firstRange && secondRange
    && firstRange[0] < secondRange[1] && secondRange[0] < firstRange[1]);
};

const getTrackedLocation = (location: string) => {
  const normalized = location.trim().toUpperCase();
  if (normalized === 'AUD' || normalized === 'AUDITORIUM') return 'AUD';
  return normalized === 'MPR' ? 'MPR' : null;
};

export const getScheduleConflicts = (
  schedule: DailySchedule,
  otherSchedules: DailySchedule[] = [],
  includeCrossAcademy = false
): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  const events = schedule.events || [];

  events.forEach((first, index) => {
    events.slice(index + 1).forEach(second => {
      if (eventsOverlapInTime(first, second)) conflicts.push({ first, second, kind: 'time' });
    });
  });

  if (!includeCrossAcademy || !schedule.academy) return conflicts;

  otherSchedules
    .filter(other => other.date === schedule.date && other.academy && other.academy !== schedule.academy)
    .forEach(other => (schedule.events || []).forEach(first => {
      const location = getTrackedLocation(first.location);
      if (!location) return;
      (other.events || []).forEach(second => {
        if (location === getTrackedLocation(second.location) && eventsOverlapInTime(first, second)) {
          conflicts.push({ first, second, kind: 'location', otherAcademy: other.academy });
        }
      });
    }));

  return conflicts;
};

export const hasScheduleConflict = (schedule: DailySchedule) => getScheduleConflicts(schedule).length > 0;

export const hasCrossAcademyLocationConflict = (schedule: DailySchedule, otherSchedules: DailySchedule[]) =>
  getScheduleConflicts(schedule, otherSchedules, true).some(conflict => conflict.kind === 'location');
