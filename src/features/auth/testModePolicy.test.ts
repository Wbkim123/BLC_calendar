import { describe, expect, it } from '@jest/globals';
import { assertTestSessionWriteAllowed } from './testModePolicy';

describe('isolated test session policy', () => {
  it('blocks writes unless the session is routed to its isolated database', () => {
    expect(() => assertTestSessionWriteAllowed(true)).toThrow(/read-only/);
    expect(() => assertTestSessionWriteAllowed(false)).not.toThrow();
  });

  it('permits test writes only when routed to staging', () => {
    expect(() => assertTestSessionWriteAllowed(true, true)).not.toThrow();
    expect(() => assertTestSessionWriteAllowed(false, true)).toThrow();
  });
});
