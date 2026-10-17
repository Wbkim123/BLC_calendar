import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fetchAndActivate } from 'firebase/remote-config';
import AppUpdateProvider, { UpdateSettingsCard } from './AppUpdateProvider';
import { STORE_URLS } from './policy';

let mockPlatform = 'ios';
let mockRelease = '';
jest.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mockPlatform, isNativePlatform: () => mockPlatform !== 'web' } }));
jest.mock('@capacitor/app', () => ({ App: {
  getInfo: async () => ({ version: '2.0.0' }),
  addListener: async () => ({ remove: async () => undefined })
} }));
jest.mock('../../firebase', () => ({ app: {} }));
jest.mock('firebase/remote-config', () => ({
  isSupported: async () => true,
  getRemoteConfig: () => ({ settings: {} }),
  fetchAndActivate: require('@jest/globals').jest.fn(async () => true),
  getValue: () => ({ asString: () => mockRelease })
}));
const content = <AppUpdateProvider><div>Schedule remains available</div><UpdateSettingsCard /></AppUpdateProvider>;
beforeEach(() => {
  localStorage.clear();
  mockPlatform = 'ios';
  mockRelease = JSON.stringify({ enabled: true, latestVersion: '2.1.0', notes: 'New schedule features' });
  jest.mocked(fetchAndActivate).mockReset().mockResolvedValue(true);
});
describe('optional store update guidance', () => {
  it.each(['ios', 'android'] as const)('opens the correct %s store and keeps Settings available after Later', async (platform: 'ios' | 'android') => {
    mockPlatform = platform;
    const view = render(content);
    await screen.findByRole('dialog');
    expect(screen.getByText('New schedule features')).toBeTruthy();
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe(STORE_URLS[platform]);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('App update available')).toBeTruthy();
    view.unmount();
    render(content);
    await screen.findByText('App update available');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('prompts for a new release even when the previous release was snoozed', async () => {
    const view = render(content);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    view.unmount();
    mockRelease = JSON.stringify({ enabled: true, latestVersion: '2.2.0', notes: 'Next release' });
    render(content);
    await screen.findByRole('dialog');
    expect(screen.getByText('Next release')).toBeTruthy();
  });
  it('does not check for native store updates on web/PWA', async () => {
    mockPlatform = 'web';
    render(content);
    await waitFor(() => expect(screen.getByText('Schedule remains available')).toBeTruthy());
    expect(fetchAndActivate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('keeps the app available when fetching the release fails', async () => {
    jest.mocked(fetchAndActivate).mockRejectedValue(new Error('Offline'));
    render(content);
    await waitFor(() => expect(fetchAndActivate).toHaveBeenCalled());
    expect(screen.getByText('Schedule remains available')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('does not prompt or show Settings guidance for the installed version', async () => {
    mockRelease = JSON.stringify({ enabled: true, latestVersion: '2.0.0' });
    render(content);
    await waitFor(() => expect(fetchAndActivate).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('App update available')).toBeNull();
  });
});
