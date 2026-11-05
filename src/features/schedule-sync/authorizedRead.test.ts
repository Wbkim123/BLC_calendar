import { beforeEach, expect, jest, test } from '@jest/globals';
import { fetchAuthorizedSchedules, fetchAuthorizedStagingSchedules } from './authorizedRead';
import { AccessProfile } from '../../types/academy';
let mockStaging = false;
jest.mock('../../firebase', () => ({ app: { options: { projectId: 'demo-read-policy' } }, useFirebaseEmulators: false }));
jest.mock('../../staging', () => ({ isStagingSession: () => mockStaging, stagingConfig: { projectId: 'demo-staging' } }));

const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
test.each([
  [undefined, undefined, false, false],
  ['false', 'true', false, true],
  ['true', 'true', true, true],
  ['true', 'false', true, true]
])('build flags production=%s staging=%s select the intended routes', (production, staging, expectedProduction, expectedStaging) => {
  const oldProduction = process.env.REACT_APP_SECURE_SCHEDULE_READS;
  const oldStaging = process.env.REACT_APP_STAGING_SECURE_SCHEDULE_READS;
  try {
    if (production === undefined) delete process.env.REACT_APP_SECURE_SCHEDULE_READS;
    else process.env.REACT_APP_SECURE_SCHEDULE_READS = production;
    if (staging === undefined) delete process.env.REACT_APP_STAGING_SECURE_SCHEDULE_READS;
    else process.env.REACT_APP_STAGING_SECURE_SCHEDULE_READS = staging;
    jest.isolateModules(() => {
      const flags = require('./authorizedRead');
      expect(flags.secureScheduleReads).toBe(expectedProduction);
      expect(flags.secureStagingScheduleReads).toBe(expectedStaging);
    });
  } finally {
    if (oldProduction === undefined) delete process.env.REACT_APP_SECURE_SCHEDULE_READS;
    else process.env.REACT_APP_SECURE_SCHEDULE_READS = oldProduction;
    if (oldStaging === undefined) delete process.env.REACT_APP_STAGING_SECURE_SCHEDULE_READS;
    else process.env.REACT_APP_STAGING_SECURE_SCHEDULE_READS = oldStaging;
  }
});
beforeEach(() => { global.fetch = request; request.mockReset(); mockStaging = false; });

test('staging reads require a staging session and send no production credential', async () => {
  const profile: AccessProfile = { role: 'STUDENT', accessLevel: 'STUDENT', academy: 'BLC', scope: 'BLC', permissions: ['schedule.read'], studentCycleName: '01-35' };
  const signal = new AbortController().signal;
  await expect(fetchAuthorizedStagingSchedules(profile, 'fixture-token', signal)).rejects.toThrow('Staging');
  expect(request).not.toHaveBeenCalled();
  mockStaging = true;
  request.mockResolvedValue({ ok: true, json: async () => ({ result: { schedules: {} } }) } as Response);
  await fetchAuthorizedStagingSchedules(profile, 'fixture-token', signal);
  expect(request.mock.calls[0][0]).toContain('demo-staging');
  expect(JSON.parse(request.mock.calls[0][1]?.body as string).data).toEqual({ academy: 'BLC', accessLevel: 'STUDENT', studentCycleName: '01-35' });
});

test('missing credential makes no public or callable request', async () => {
  await expect(fetchAuthorizedSchedules(null, 'BLC', new AbortController().signal)).rejects.toThrow('sign in');
  expect(request).not.toHaveBeenCalled();
});

test('sends credentials only in POST body and does not trust a caller profile', async () => {
  const result = { profile: { role: 'STUDENT' }, schedules: {}, locations: [], uniforms: [] };
  request.mockResolvedValue({ ok: true, json: async () => ({ result }) } as Response);
  expect(await fetchAuthorizedSchedules('synthetic-fixture', 'BLC', new AbortController().signal)).toEqual(result);
  expect(request.mock.calls[0][0]).not.toContain('synthetic-fixture');
  expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toEqual({ data: { code: 'synthetic-fixture', academy: 'BLC' } });
});

test('denied callable fails closed without a public database retry', async () => {
  request.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: 'private detail' } }) } as Response);
  await expect(fetchAuthorizedSchedules('synthetic-fixture', 'KTA', new AbortController().signal)).rejects.toThrow('expired');
  expect(request).toHaveBeenCalledTimes(1);
});
