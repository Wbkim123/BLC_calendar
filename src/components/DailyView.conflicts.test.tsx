import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import DailyView from './DailyView';
import { DailySchedule } from '../types/schedule';

jest.mock('./AdMobBanner', () => () => null);

const noOp = () => undefined;
const event = (id: string, time: string, eventName: string, location: string) => ({
  id, time, eventName, location, uniform: 'ACU'
});

const baseProps = {
  role: 'VIEWER' as const,
  onSave: noOp,
  onSaveDayLabel: noOp,
  onSaveNotes: noOp,
  onToggleNotesHighlight: noOp,
  onSaveSglNotes: noOp,
  onToggleSglNotesHighlight: noOp,
  onCreateEvent: noOp,
  onDeleteEvent: noOp,
  locations: [],
  uniforms: [],
  onAddLocation: noOp,
  onAddUniform: noOp,
  displayMode: 'auto' as const
};

describe('Event View conflict details', () => {
  it('lists each overlapping event on the affected event cards', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2026-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0900-1100', 'Morning Formation', 'MPR'), event('b', '1000-1200', 'Medical Brief', 'AUD')]
    };

    render(<DailyView {...baseProps} schedule={schedule} />);

    expect(screen.getAllByText('Time conflict')).toHaveLength(2);
    expect(screen.getAllByText(/Medical Brief · AUD/)).toHaveLength(1);
    expect(screen.getAllByText(/Morning Formation · MPR/)).toHaveLength(1);
    expect(screen.getAllByLabelText(/Conflicts for/)).toHaveLength(2);
  });

  it('shows the commander cross-academy AUD/MPR counterpart in Event View', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2026-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('blc', '0900-1100', 'BLC Formation', 'AUD')]
    };
    const other: DailySchedule = {
      academy: 'KTA', date: schedule.date, dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('kta', '1000-1200', 'KTA Lecture', 'AUD')]
    };

    const { container } = render(<DailyView {...baseProps} schedule={schedule} crossAcademySchedules={[other]} showCrossAcademyConflicts />);

    expect(screen.getByText('Location conflict · AUD · KTA')).toBeTruthy();
    expect(container.querySelector('[aria-label="Conflicts for BLC Formation"]')?.textContent).toContain('KTA Lecture');
    expect(container.querySelector('[aria-label="Conflicts for BLC Formation"]')?.textContent).toContain('KTA');
  });
});
