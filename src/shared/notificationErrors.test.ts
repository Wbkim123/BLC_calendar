import { notificationEnableError } from './notificationErrors';
import { expect, test } from '@jest/globals';
test('permission instructions match the actual phone', () => {
  expect(notificationEnableError(new Error('denied'), 'ios')).toContain('iPhone Settings');
  expect(notificationEnableError(new Error('denied'), 'android')).toContain('Android Settings');
});
test('server registration errors are not presented as phone permission failures', () => {
  expect(notificationEnableError({ code: 'permission-denied' }, 'android')).toContain('server denied registration');
  expect(notificationEnableError({ code: 'internal' }, 'android')).toContain('temporarily unavailable');
  expect(notificationEnableError(new Error('billing is disabled'), 'android')).toContain('billing problem');
});
