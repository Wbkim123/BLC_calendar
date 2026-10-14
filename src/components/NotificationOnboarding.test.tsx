import React from 'react';
import { expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationOnboarding from './NotificationOnboarding';

jest.mock('./NotificationPrompt', () => () => <button disabled>UPDATING...</button>);

test('both dismiss controls work independently of a pending notification request', () => {
  const onDismiss = jest.fn();
  const onEnabled = jest.fn();
  render(<NotificationOnboarding role="ADMIN" academy="KTA" allAcademies={false} cycleName={null}
    testMode={false} onDismiss={onDismiss} onEnabled={onEnabled} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification prompt' }));
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(onDismiss).toHaveBeenCalledTimes(2);
  expect(onEnabled).not.toHaveBeenCalled();
});
