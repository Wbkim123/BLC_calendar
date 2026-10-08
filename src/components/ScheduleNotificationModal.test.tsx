import React from 'react';
import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import type { MockedFunction } from 'jest-mock';
import { fireEvent, render, screen } from '@testing-library/react';
import ScheduleNotificationModal from './ScheduleNotificationModal';
import { sendScheduleNotification } from '../notifications';
jest.mock('../notifications', () => ({ sendScheduleNotification: require('@jest/globals').jest.fn(), sendTestScheduleNotification: require('@jest/globals').jest.fn() }));
const change = { date: '2099-01-01', cycleName: 'fixture', changeType: 'Event updated', targetId: 'event:fixture', changedFields: ['location'] };
beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.restoreAllMocks(); });
test('can close without sending any notification', () => {
  const onClose = jest.fn();
  render(<ScheduleNotificationModal academy="BLC" change={change} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Close notification dialog' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(sendScheduleNotification).not.toHaveBeenCalled();
});
test('can close while a send is stalled', () => {
  (sendScheduleNotification as MockedFunction<typeof sendScheduleNotification>).mockReturnValue(new Promise(() => undefined));
  const onClose = jest.fn();
  render(<ScheduleNotificationModal academy="BLC" change={change} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close notification dialog' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
test('failed No send leaves a working close control', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  (sendScheduleNotification as MockedFunction<typeof sendScheduleNotification>).mockRejectedValue(new Error('unavailable'));
  const onClose = jest.fn();
  render(<ScheduleNotificationModal academy="KTA" change={change} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'No' }));
  await screen.findByText(/Firebase is temporarily unavailable/);
  fireEvent.click(screen.getByRole('button', { name: 'Close notification dialog' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
