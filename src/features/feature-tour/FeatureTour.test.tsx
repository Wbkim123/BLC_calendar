import React from 'react';
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import FeatureTour from './FeatureTour';
import { useFeatureTour } from './useFeatureTour';
import { getTourSteps, tourStorageKey } from './policy';
import { AccessProfile } from '../../types/academy';

const student: AccessProfile = { role: 'STUDENT', academy: 'BLC', scope: 'BLC', accessLevel: 'STUDENT', permissions: ['schedule.read'] };
function Harness({ enabled = true, blocked = false, profile = student }: { enabled?: boolean; blocked?: boolean; profile?: AccessProfile }) {
  const tour = useFeatureTour(enabled, blocked);
  return <><button onClick={tour.replay}>Replay guide</button>{tour.open && <FeatureTour profile={profile} onClose={tour.dismiss} />}</>;
}
beforeEach(() => localStorage.clear());
afterEach(() => { jest.restoreAllMocks(); });

describe('feature guide rollout', () => {
  it('shows to an existing installation with an older guide marker and stays dismissed across remounts', () => {
    localStorage.setItem(tourStorageKey('old-revision'), 'seen');
    const first = render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Your day, at a glance' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close app guide' }));
    expect(localStorage.getItem(tourStorageKey())).toBe('seen');
    first.unmount();
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Replay guide'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('waits for login and other blocking prompts without marking the guide seen', () => {
    const view = render(<Harness enabled={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<Harness blocked />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(tourStorageKey())).toBeNull();
    view.rerender(<Harness />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('walks through the student guide and completes without exposing staff tools', () => {
    render(<Harness />);
    expect(screen.getByText('Your calendar shows your assigned cycle.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Search stays within your assigned cycle.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Your day, at a glance' })).toBeTruthy();
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(tourStorageKey())).toBe('seen');
    expect(getTourSteps(student).map(step => step.id)).toEqual(['schedule', 'search', 'notifications', 'settings']);
  });

  it('uses permissions for edit/import and keeps Commander guidance read-only', () => {
    const chief: AccessProfile = { ...student, role: 'ADMIN', accessLevel: 'SCHEDULE_IMPORTER', academy: 'KTA', scope: 'KTA', permissions: ['schedule.read', 'schedule.write', 'schedule.import'] };
    expect(getTourSteps(chief).map(step => step.id)).toContain('edit');
    expect(getTourSteps(chief).find(step => step.id === 'import')?.description).toContain('KTA');
    expect(getTourSteps({ ...chief, permissions: ['schedule.read'] }).map(step => step.id)).not.toContain('edit');
    const commander: AccessProfile = { ...student, role: 'VIEWER', accessLevel: 'NCOA_MANAGER', scope: 'NCOA' };
    const steps = getTourSteps(commander);
    expect(steps.map(step => step.id)).toContain('academies');
    expect(steps.map(step => step.id)).not.toContain('import');
    expect(steps.find(step => step.id === 'academies')?.tips.join(' ')).toContain('read-only');
  });

  it('supports Escape, focus containment and dismissal when storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
    const view = render(<Harness />);
    const close = screen.getByRole('button', { name: 'Close app guide' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Escape' });
    view.rerender(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
