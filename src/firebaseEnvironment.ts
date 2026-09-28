export interface FirebaseEnvironmentOptions {
  nodeEnv: string;
  useEmulators: boolean;
  projectId: string;
  emulatorHost: string;
}

export const assertSafeFirebaseEnvironment = ({
  nodeEnv, useEmulators, projectId, emulatorHost
}: FirebaseEnvironmentOptions) => {
  if (nodeEnv === 'development' && !useEmulators) {
    throw new Error('Local development must use the Firebase Emulator Suite.');
  }
  if (useEmulators && nodeEnv === 'production') {
    throw new Error('Firebase emulators cannot be enabled in a production build.');
  }
  if (useEmulators && !projectId.startsWith('demo-')) {
    throw new Error('Emulator mode requires an isolated demo-* Firebase project ID.');
  }
  if (useEmulators && !['localhost', '127.0.0.1'].includes(emulatorHost)) {
    throw new Error('Emulator mode only permits a local loopback host.');
  }
};
