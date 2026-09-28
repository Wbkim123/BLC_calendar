export const assertTestSessionWriteAllowed = (testMode: boolean, staging = false) => {
  if (testMode !== staging) {
    throw new Error('Test sessions are read-only outside their isolated staging database.');
  }
};
