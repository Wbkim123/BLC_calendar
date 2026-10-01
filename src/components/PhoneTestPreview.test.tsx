import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react';
import PhoneTestPreview from './PhoneTestPreview';

const loginKey = 'blc_calendar_login';

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(loginKey);
  window.history.replaceState({}, '', '/');
});

describe('PhoneTestPreview', () => {
  it('shows a phone frame for the local emulator administrator session', async () => {
    window.localStorage.setItem(loginKey, JSON.stringify({ role: 'ADMIN', localEmulator: true }));

    render(<PhoneTestPreview><div>Calendar</div></PhoneTestPreview>);

    expect(await screen.findByTitle('Mobile app test preview')).toBeTruthy();
    expect(screen.getByLabelText('Phone-sized test preview')).toBeTruthy();
  });

  it('keeps the phone frame for the staging test session', async () => {
    window.localStorage.setItem(loginKey, JSON.stringify({ role: 'ADMIN', testMode: true }));

    render(<PhoneTestPreview><div>Calendar</div></PhoneTestPreview>);

    expect(await screen.findByTitle('Mobile app test preview')).toBeTruthy();
  });

  it('does not wrap ordinary sessions', () => {
    window.localStorage.setItem(loginKey, JSON.stringify({ role: 'ADMIN' }));

    render(<PhoneTestPreview><div>Calendar</div></PhoneTestPreview>);

    expect(screen.queryByLabelText('Phone-sized test preview')).toBeNull();
  });
});
