// CRA provides Jest globals at runtime; this repository's standalone tsc command excludes no test files.
// @ts-nocheck
import { assertSafeFirebaseEnvironment } from './firebaseEnvironment';

describe('Firebase environment isolation', () => {
  const safeDevelopment = {
    nodeEnv: 'development', useEmulators: true,
    projectId: 'demo-blc-calendar', emulatorHost: '127.0.0.1'
  };

  it('allows local development against the demo emulator project', () => {
    expect(() => assertSafeFirebaseEnvironment(safeDevelopment)).not.toThrow();
  });

  it('rejects development without emulators', () => {
    expect(() => assertSafeFirebaseEnvironment({ ...safeDevelopment, useEmulators: false })).toThrow();
  });

  it('rejects production emulator settings', () => {
    expect(() => assertSafeFirebaseEnvironment({ ...safeDevelopment, nodeEnv: 'production' })).toThrow();
  });

  it('rejects non-demo projects and remote emulator hosts', () => {
    expect(() => assertSafeFirebaseEnvironment({ ...safeDevelopment, projectId: 'blc-calendar-e302f' })).toThrow();
    expect(() => assertSafeFirebaseEnvironment({ ...safeDevelopment, emulatorHost: 'example.com' })).toThrow();
  });
});
