import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DailyView from './DailyView';
import { DailySchedule } from '../types/schedule';
import { getScheduleConflicts } from '../features/schedule-conflicts/conflicts';
import { getConflictPairKey } from '../features/schedule-conflicts/dismissals';

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

  it('keeps the event editor and draft after a rejected save and prevents duplicate submissions', async () => {
    let finishSave: (saved: boolean) => void = () => undefined;
    const onSave = jest.fn(() => new Promise<boolean>(resolve => { finishSave = resolve; }));
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2026-10-21', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0900-1000', 'Original event', 'MPR')]
    };
    render(<DailyView {...baseProps} role="ADMIN" schedule={schedule} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Original event' }));
    const input = screen.getByDisplayValue('Original event');
    fireEvent.change(input, { target: { value: 'Draft event' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => finishSave(false));
    expect(screen.getByDisplayValue('Draft event')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await act(async () => finishSave(true));
    await waitFor(() => expect(screen.queryByText('Edit Event')).toBeNull());
  });

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

  it('shows the commander cross-academy counterpart as a distinct location conflict in Event View', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('blc', '0900-1100', 'BLC Formation', 'AUD')]
    };
    const other: DailySchedule = {
      academy: 'KTA', date: schedule.date, dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('kta', '1000-1200', 'KTA Lecture', 'AUD')]
    };

    const { container } = render(<DailyView {...baseProps} schedule={schedule} crossAcademySchedules={[other]} showCrossAcademyConflicts />);

    const crossConflict = container.querySelector('[aria-label="Cross-academy location conflict with KTA"]');
    expect(crossConflict?.textContent).toContain('BLC ↔ KTA shared-location conflict · AUD');
    expect(crossConflict?.textContent).toContain('1000-1200 · KTA · KTA Lecture · AUD');
    expect(container.querySelector('.daily-event-card')?.className).toContain('cross-academy-location-conflict');
    expect(screen.queryByRole('button', { name: /dismiss conflict with KTA Lecture/i })).toBeNull();
  });

  it('lets a viewer dismiss a conflict pair and normalizes both event cards without changing schedule data', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
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
      academy: 'BLC', date: '2099-10-03', dayLabel: 'DAY 2', cycleName: 'cycle',
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

    const onDismissKtaConflict = jest.fn();
    const { container } = render(<DailyView {...baseProps} schedule={schedule} canDismissKtaConflicts onDismissKtaConflict={onDismissKtaConflict} />);
    const group = container.querySelector('.daily-simultaneous-events');
    const header = group?.firstElementChild;

    expect(group).not.toBeNull();
    expect(header?.firstElementChild?.textContent).toBe('0800-1030');
    expect(header?.lastElementChild?.textContent).toBe('Same time · different rooms');
    expect(group?.querySelectorAll('.daily-event-card')).toHaveLength(2);
    expect(group?.className).toContain('border-yellow-500');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss conflict with Class B' }));

    expect(onDismissKtaConflict).toHaveBeenCalledWith(schedule.date, getConflictPairKey(getScheduleConflicts(schedule)[0]));
    expect(group?.className).toContain('border-yellow-500');
    expect(group?.querySelectorAll('.schedule-conflict-event')).toHaveLength(2);
    expect(group?.querySelectorAll('.daily-event-card')).toHaveLength(2);
    expect(schedule.events).toHaveLength(2);
  });

  it('uses the normal schedule colors for upcoming, ongoing, and completed groups', () => {
    const makeSchedule = (date: string, time: string): DailySchedule => ({
      academy: 'KTA', date, dayLabel: 'DAY', cycleName: 'cycle',
      events: [event('a', time, 'Class A', 'RM 1'), event('b', time, 'Class B', 'RM 2')]
    });
    const future = render(<DailyView {...baseProps} schedule={makeSchedule('2099-10-02', '0800-1030')} />);
    const futureGroup = future.container.querySelector('.daily-simultaneous-events');
    expect(futureGroup?.className).toContain('border-yellow-500');
    future.unmount();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 3, 12, 0));
    try {
      const ongoing = render(<DailyView {...baseProps} schedule={makeSchedule('2026-10-03', '0800-1600')} />);
      expect(ongoing.container.querySelector('.daily-simultaneous-events')?.className).toContain('border-green-500');
      ongoing.unmount();
    } finally {
      jest.useRealTimers();
    }

    const past = render(<DailyView {...baseProps} schedule={makeSchedule('2000-10-02', '0800-1030')} />);
    const pastGroup = past.container.querySelector('.daily-simultaneous-events');
    expect(pastGroup?.className).toContain('border-gray-400');
    expect(pastGroup?.className).toContain('opacity-60');
  });

  it('groups exact same-time, same-location events in one dismissible shared card', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('a', '0900-1000', 'Class A', 'Room 1'), event('b', '0900-1000', 'Class B', 'room 1')]
    };

    const onDismissKtaConflict = jest.fn();
    const { container } = render(<DailyView {...baseProps} schedule={schedule} canDismissKtaConflicts onDismissKtaConflict={onDismissKtaConflict} />);

    expect(screen.getByText('Same time & place · listed together')).toBeTruthy();
    expect(container.querySelectorAll('[aria-label^="Conflicts for Class"]')).toHaveLength(0);
    expect(screen.queryByText('Time conflict')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss shared conflict for Class A and Class B' }));

    expect(onDismissKtaConflict).toHaveBeenCalledWith(schedule.date, getConflictPairKey(getScheduleConflicts(schedule)[0]));
    expect(screen.getByText('Same time & place · listed together')).toBeTruthy();
    expect(container.querySelectorAll('.schedule-conflict-event').length).toBeGreaterThan(0);
    expect(screen.getByText('Schedule conflicts are listed on the affected events below.')).toBeTruthy();
    expect(schedule.events).toHaveLength(2);
  });

  it('shows a minimal cross-academy notice on the affected Chief event without revealing the other event', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('blc-own', '0900-1100', 'BLC Formation', 'MPR')]
    };
    const { container } = render(<DailyView
      {...baseProps}
      role="ADMIN"
      schedule={schedule}
      crossAcademyConflictCheckStatus="ready"
      crossAcademyConflictNotices={[{ date: schedule.date, eventId: 'blc-own', location: 'MPR', otherAcademy: 'KTA' }]}
    />);

    expect(screen.getByText('A KTA event overlaps this event at MPR.')).toBeTruthy();
    expect(container.querySelector('.cross-academy-location-conflict')).not.toBeNull();
    expect(screen.queryByText(/SECRET|KTA Lecture|other-secret-id/)).toBeNull();
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
  });

  it('does not show Chief cross-academy notices to a student profile', () => {
    const schedule: DailySchedule = {
      academy: 'BLC', date: '2099-10-02', dayLabel: 'DAY 1', cycleName: 'cycle',
      events: [event('blc-own', '0900-1100', 'BLC Formation', 'MPR')]
    };
    render(<DailyView
      {...baseProps}
      role="STUDENT"
      schedule={schedule}
      crossAcademyConflictCheckStatus="ready"
      crossAcademyConflictNotices={[{ date: schedule.date, eventId: 'blc-own', location: 'MPR', otherAcademy: 'KTA' }]}
    />);

    expect(screen.queryByText('A KTA event overlaps this event at MPR.')).toBeNull();
  });

  it('shows KTA conflicts to viewers without allowing them to dismiss', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-04', dayLabel: 'DAY 3', cycleName: 'cycle',
      events: [event('a', '0900-1100', 'Class A', 'Room 1'), event('b', '1000-1200', 'Class B', 'Room 2')]
    };

    const { container } = render(<DailyView {...baseProps} schedule={schedule} />);

    expect(container.querySelectorAll('.schedule-conflict-event')).toHaveLength(2);
    expect(screen.getAllByText('Time conflict')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
  });

  it('reads dismissed KTA conflicts from the shared schedule data', () => {
    const schedule: DailySchedule = {
      academy: 'KTA', date: '2099-10-05', dayLabel: 'DAY 4', cycleName: 'cycle',
      events: [event('a', '0900-1100', 'Class A', 'Room 1'), event('b', '1000-1200', 'Class B', 'Room 2')]
    };
    schedule.dismissedConflictKeys = [getConflictPairKey(getScheduleConflicts(schedule)[0])];

    const { container } = render(<DailyView {...baseProps} schedule={schedule} />);

    expect(screen.queryByText('Schedule conflicts are listed on the affected events below.')).toBeNull();
    expect(screen.queryByLabelText(/Conflicts for/)).toBeNull();
    expect(container.querySelector('.schedule-conflict-event')).toBeNull();
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
