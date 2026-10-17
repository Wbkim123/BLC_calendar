import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import Calendar from './Calendar';
import { DailySchedule } from '../types/schedule';
import { getScheduleConflicts } from '../features/schedule-conflicts/conflicts';
import { getConflictPairKey, getDismissedConflictStorageKey } from '../features/schedule-conflicts/dismissals';

jest.mock('./AdMobBanner', () => () => null);

const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const schedule: DailySchedule = {
  academy: 'BLC',
  date,
  dayLabel: 'DAY 1',
  cycleName: 'test-cycle',
  events: [
    { id: 'first', time: '0900-1100', eventName: 'Morning Formation', location: 'MPR', uniform: 'ACU' },
    { id: 'second', time: '1000-1200', eventName: 'Medical Brief', location: 'AUD', uniform: 'ACU' }
  ]
};

describe('calendar conflict navigation', () => {
  beforeEach(() => window.localStorage.clear());

  it('has no conflict exclamation button and opens Event View by selecting the date', () => {
    const onSelectDate = jest.fn();
    render(
      <Calendar
        schedules={[schedule]}
        academy="BLC"
        onSelectDate={onSelectDate}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    expect(screen.queryByRole('button', { name: /conflict details/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `${date}, ${schedule.dayLabel}, Internal schedule conflict` }));

    expect(onSelectDate).toHaveBeenCalledWith(date);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not visually mark conflict dates for students', () => {
    render(
      <Calendar
        schedules={[schedule]}
        academy="BLC"
        role="STUDENT"
        onSelectDate={() => undefined}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    expect(document.querySelector('.calendar-day-conflict')).toBeNull();
  });

  it('restores the normal blue date color after staff dismisses its conflict in Event View', () => {
    const conflict = getScheduleConflicts(schedule)[0];
    window.localStorage.setItem(
      getDismissedConflictStorageKey(schedule.academy, schedule.date),
      JSON.stringify([getConflictPairKey(conflict)])
    );

    render(
      <Calendar
        schedules={[schedule]}
        academy="BLC"
        role="ADMIN"
        onSelectDate={() => undefined}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    const calendarDay = screen.getByRole('button', { name: `${date}, ${schedule.dayLabel}` }).closest('.calendar-day');
    expect(calendarDay?.className).not.toContain('calendar-day-conflict');
    expect(calendarDay?.className).toContain('bg-blue-50');
  });

  it('marks a cross-academy location conflict orange with its own building symbol, distinct from an internal conflict', () => {
    render(
      <Calendar
        schedules={[{ ...schedule, events: [schedule.events[0]] }]}
        academy="BLC"
        role="ADMIN"
        crossAcademyConflictCheckStatus="ready"
        crossAcademyConflictNotices={[{ date, eventId: 'first', location: 'MPR', otherAcademy: 'KTA' }]}
        onSelectDate={() => undefined}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    const calendarButton = screen.getByRole('button', { name: `${date}, ${schedule.dayLabel}, Cross-academy shared-location conflict` });
    const calendarDay = calendarButton.closest('.calendar-day');
    expect(calendarDay?.className).toContain('bg-orange-50');
    expect(calendarDay?.className).toContain('calendar-day-location-only');
    expect(calendarDay?.className).not.toContain('bg-red-50');
    expect(calendarDay?.querySelector('.calendar-location-conflict-badge svg')).not.toBeNull();
    const locationBadge = calendarDay?.querySelector('.calendar-location-conflict-badge');
    expect(locationBadge?.className).toContain('rounded-full');
    expect(locationBadge?.className).toContain('left-0.5');
    expect(locationBadge?.className).toContain('top-0.5');
    expect(locationBadge?.className).toContain('-translate-x-1/2');
    expect(screen.getByText('Orange building marks a cross-academy location conflict.')).toBeTruthy();
  });

  it('uses shared KTA dismissal data for the calendar conflict color', () => {
    const ktaSchedule: DailySchedule = {
      ...schedule,
      academy: 'KTA',
      dismissedConflictKeys: [getConflictPairKey(getScheduleConflicts(schedule)[0])]
    };

    render(
      <Calendar
        schedules={[ktaSchedule]}
        academy="KTA"
        role="VIEWER"
        onSelectDate={() => undefined}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    const calendarDay = screen.getByRole('button', { name: `${date}, ${schedule.dayLabel}` }).closest('.calendar-day');
    expect(calendarDay?.className).not.toContain('calendar-day-conflict');
  });

  it('restores the normal blue date color when an edit removes the time overlap', () => {
    const resolvedSchedule = {
      ...schedule,
      events: schedule.events.map(event => event.id === 'second' ? { ...event, time: '1100-1200' } : event)
    };

    render(
      <Calendar
        schedules={[resolvedSchedule]}
        academy="BLC"
        role="ADMIN"
        onSelectDate={() => undefined}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    const calendarDay = screen.getByRole('button', { name: `${date}, ${schedule.dayLabel}` }).closest('.calendar-day');
    expect(calendarDay?.className).not.toContain('calendar-day-conflict');
    expect(calendarDay?.className).toContain('bg-blue-50');
  });
});
