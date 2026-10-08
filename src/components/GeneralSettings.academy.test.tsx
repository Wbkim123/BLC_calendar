import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, jest, test } from '@jest/globals';
import GeneralSettings from './GeneralSettings';
jest.mock('./AdMobBanner', () => ({ isAdPrivacyOptionsRequired: async () => false, showAdPrivacyOptions: async () => undefined }));
jest.mock('./NotificationPrompt', () => () => null);
const base = { academy: 'BLC' as const, schedules: [], darkMode: false,
  onDarkModeChange: jest.fn(), onLogout: jest.fn(), onDeleteCycle: jest.fn(), onResetSchedules: jest.fn(),
  academyControl: <button>Switch academy</button> };
test('read-only Commander can switch academy without receiving Chief tools', async () => {
  render(<GeneralSettings {...base} role="VIEWER" accessLevel="NCOA_MANAGER" allAcademies />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Open settings' })); });
  expect(screen.getByRole('button', { name: 'Switch academy' })).toBeTruthy();
  expect(screen.queryByText('Database Management')).toBeNull();
});
test('academy-scoped Chief cannot switch academy', async () => {
  render(<GeneralSettings {...base} role="ADMIN" accessLevel="SCHEDULE_IMPORTER" />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Open settings' })); });
  expect(screen.queryByRole('button', { name: 'Switch academy' })).toBeNull();
});
