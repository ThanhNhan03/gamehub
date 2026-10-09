import { describe, expect, it } from 'vitest';
import { authenticate } from './auth.js';

const identity = {
  sessionToken: '5d661efe-1c6b-4e47-8d09-04c8e3432acf',
  playerId: '8b6e79ef-4f80-4862-8213-8d4828a4ccdf',
  nickname: '  Minh  ',
  avatar: 2,
};
describe('socket identity boundary', () => {
  it('accepts a real identity and trims its nickname', () => {
    expect(authenticate(identity, '').identity?.nickname).toBe('Minh');
  });
  it('requires the configured office code', () => {
    expect(authenticate(identity, 'test-code').error).toBeTruthy();
    expect(
      authenticate({ ...identity, accessCode: 'wrong' }, 'test-code').error,
    ).toBeTruthy();
    expect(
      authenticate({ ...identity, accessCode: 'test-code' }, 'test-code')
        .identity,
    ).toBeTruthy();
  });
  it.each([
    null,
    { ...identity, playerId: 'not-a-uuid' },
    { ...identity, nickname: ' ' },
    { ...identity, nickname: 'a'.repeat(25) },
    { ...identity, avatar: 8 },
    { ...identity, avatar: -1 },
    { ...identity, avatar: 1.5 },
    { ...identity, isHost: true },
    { ...identity, accessCode: 'a'.repeat(129) },
  ])('rejects invalid client payload %j', (payload) => {
    expect(authenticate(payload, '').error).toBeTruthy();
  });
});
