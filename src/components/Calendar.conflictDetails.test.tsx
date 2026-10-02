import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import Calendar from './Calendar';
import { DailySchedule } from '../types/schedule';

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
    fireEvent.click(screen.getByRole('button', { name: `${date}, ${schedule.dayLabel}` }));

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
});
