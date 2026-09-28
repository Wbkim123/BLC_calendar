import { expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationPrompt from './NotificationPrompt';

jest.mock('../notifications', () => ({
  isPhoneDevice: () => true,
  getNotificationAvailability: async () => 'prompt',
  enableNotifications: async () => { throw new Error(`Approve test device: ${'a'.repeat(64)}`); },
  disableNotifications: async () => undefined,
  syncNotificationSubscription: async () => undefined
}));

test('keeps failed device approval visible and never reports registration success', async () => {
  const onStatusChange = jest.fn();
  render(<NotificationPrompt role="ADMIN" academy="BLC" testMode autoPrompt={false}
    hideWhenGranted onStatusChange={onStatusChange} />);
  fireEvent.click(await screen.findByRole('button', { name: 'ENABLE NOTIFICATIONS' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toBe(`Approve test device: ${'a'.repeat(64)}`);
  expect(onStatusChange).not.toHaveBeenCalledWith('granted');
});
