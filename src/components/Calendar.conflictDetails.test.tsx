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

describe('calendar conflict details', () => {
  it('opens exact conflicting event pairs from the marker', () => {
    render(
      <Calendar
        schedules={[schedule]}
        academy="BLC"
        onSelectDate={() => undefined}
        onSelectSearchResult={() => undefined}
        settingsControl={null}
        displayMode="auto"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open conflict details for this date' }));

    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(screen.queryByText('Morning Formation')).not.toBeNull();
    expect(screen.queryByText('Medical Brief')).not.toBeNull();
    expect(screen.queryByText('0900-1100')).not.toBeNull();
    expect(screen.queryByText('1000-1200')).not.toBeNull();
  });
});
