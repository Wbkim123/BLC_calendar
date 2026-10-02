import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
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
  beforeEach(() => window.localStorage.clear());

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

  it('lets a viewer dismiss a conflict pair and normalizes both event cards without changing schedule data', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0900-1100', 'Class A', 'Room 1'), event('b', '1000-1200', 'Class B', 'Room 2')]
    };

    const { container } = render(<DailyView {...baseProps} schedule={schedule} />);
    const classA = screen.getByText('Class A').closest('.daily-event-card');
    const classB = screen.getByText('Class B').closest('.daily-event-card');
    expect(classA?.className).toContain('schedule-conflict-event');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss conflict with Class B' }));

    expect(classA?.className).not.toContain('schedule-conflict-event');
    expect(classB?.className).not.toContain('schedule-conflict-event');
    expect(screen.queryByText('Schedule conflicts are listed on the affected events below.')).toBeNull();
    expect(schedule.events).toHaveLength(2);
  });

  it('keeps a dismissed conflict pair hidden after leaving and reopening Event View', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-03', dayLabel: 'DAY 2', cycleName: 'cycle',
      events: [event('a', '0900-1100', 'Class A', 'Room 1'), event('b', '1000-1200', 'Class B', 'Room 2')]
    };

    const firstView = render(<DailyView {...baseProps} schedule={schedule} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss conflict with Class B' }));
    expect(screen.queryByText('Schedule conflicts are listed on the affected events below.')).toBeNull();

    firstView.unmount();
    render(<DailyView {...baseProps} schedule={schedule} />);

    expect(screen.queryByText('Schedule conflicts are listed on the affected events below.')).toBeNull();
    expect(screen.queryByLabelText(/Conflicts for/)).toBeNull();
    expect(screen.getByText('Class A').closest('.daily-event-card')?.className).not.toContain('schedule-conflict-event');
    expect(screen.getByText('Class B').closest('.daily-event-card')?.className).not.toContain('schedule-conflict-event');
  });

  it('wraps same-time KTA events in different rooms in one colored group container', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0800-1030', 'Class A', 'RM 1165'), event('b', '0800-1030', 'Class B', 'RM 1157')]
    };

    const { container } = render(<DailyView {...baseProps} schedule={schedule} />);
    const group = container.querySelector('.daily-simultaneous-events');

    expect(group).not.toBeNull();
    expect(screen.getByText('Same time · different rooms')).toBeTruthy();
    expect(group?.querySelectorAll('.daily-event-card')).toHaveLength(2);
    expect(group?.className).toContain('border-amber-400');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss conflict with Class B' }));

    expect(group?.className).toContain('border-emerald-400');
    expect(group?.querySelectorAll('.schedule-conflict-event')).toHaveLength(0);
    expect(group?.querySelectorAll('.daily-event-card')).toHaveLength(2);
    expect(schedule.events).toHaveLength(2);
  });

  it('groups exact same-time, same-location events in one dismissible shared card', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0900-1000', 'Class A', 'Room 1'), event('b', '0900-1000', 'Class B', 'room 1')]
    };

    const { container } = render(<DailyView {...baseProps} schedule={schedule} />);

    expect(screen.getByText('Same time & place · listed together')).toBeTruthy();
    expect(container.querySelectorAll('[aria-label^="Conflicts for Class"]')).toHaveLength(0);
    expect(screen.queryByText('Time conflict')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss shared conflict for Class A and Class B' }));

    expect(screen.queryByText('Same time & place · listed together')).toBeNull();
    expect(container.querySelectorAll('.schedule-conflict-event')).toHaveLength(0);
    expect(screen.queryByText('Schedule conflicts are listed on the affected events below.')).toBeNull();
    expect(schedule.events).toHaveLength(2);
  });

  it('hides conflict warnings and counterpart details from students', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2026-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0900-1100', 'Morning Formation', 'MPR'), event('b', '1000-1200', 'Medical Brief', 'AUD')]
    };

    const { container } = render(<DailyView {...baseProps} role="STUDENT" schedule={schedule} />);

    expect(screen.queryByText('Schedule conflicts are listed on the affected events below.')).toBeNull();
    expect(screen.queryByLabelText(/Conflicts for/)).toBeNull();
    expect(container.querySelector('.schedule-conflict-event')).toBeNull();
    expect(screen.queryByTitle('Time Conflict')).toBeNull();
  });
});
