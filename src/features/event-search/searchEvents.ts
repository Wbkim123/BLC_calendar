import { AcademyId } from '../../types/academy';
import { DailySchedule, TrainingEvent } from '../../types/schedule';

export type EventSearchScope = 'CURRENT_CYCLE' | 'ALL_CYCLES';

export type EventSearchResult = {
  academy: AcademyId;
  cycleName: string;
  date: string;
  dayLabel: string;
  event: TrainingEvent;
};

type SearchOptions = {
  schedules: DailySchedule[];
  academy: AcademyId;
  query: string;
  scope: EventSearchScope;
  currentCycleName?: string | null;
};

const getScheduleAcademy = (schedule: DailySchedule): AcademyId =>
  schedule.academy || 'BLC';

export function searchEvents({ schedules, academy, query, scope, currentCycleName }: SearchOptions) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  return schedules
    .filter(schedule => getScheduleAcademy(schedule) === academy)
    .filter(schedule => scope === 'ALL_CYCLES' || !currentCycleName || schedule.cycleName === currentCycleName)
    .flatMap<EventSearchResult>(schedule => (schedule.events || [])
      .filter(event => event.eventName.toLocaleLowerCase().includes(normalizedQuery))
      .map(event => ({
        academy,
        cycleName: schedule.cycleName,
        date: schedule.date,
        dayLabel: schedule.dayLabel,
        event
      })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.event.time.localeCompare(b.event.time));
}
