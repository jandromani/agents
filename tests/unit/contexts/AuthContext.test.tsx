import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth, MfaChallengeState } from '../../../src/contexts/AuthContext';

const profileTable = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
};

const auditLog = vi.fn();
const logError = vi.fn();
const logInfo = vi.fn();

const authMocks = {
  getSession: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  mfa: {
    listFactors: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
  },
  onAuthStateChange: vi.fn(),
};

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    auth: authMocks,
    from: (table: string) => {
      if (table === 'profiles') return profileTable;
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any;
    },
  },
}));

vi.mock('../../../src/lib/security', () => ({
  createAuditLog: (...args: any[]) => auditLog(...args),
}));

vi.mock('../../../src/observability', () => ({
  logError: (...args: any[]) => logError(...args),
  logInfo: (...args: any[]) => logInfo(...args),
  traceAsyncOperation: async (_name: string, fn: any) => fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authMocks.getSession as any).mockResolvedValue({ data: { session: null } });
    (authMocks.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    profileTable.maybeSingle.mockResolvedValue({ data: null, error: null });
    profileTable.insert.mockResolvedValue({ data: null, error: null });
  });

  it('throws when useAuth is used outside provider', () => {
    const Component = () => {
      useAuth();
      return null;
    };

    expect(() => Component()).toThrow(/useAuth must be used/);
  });

  it('signs up and creates audit log when registration succeeds', async () => {
    (authMocks.signUp as any).mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let captured: any;

    const Consumer = () => {
      const ctx = useAuth();
      useEffect(() => {
        captured = ctx;
      }, [ctx]);
      return null;
    };

    const container = document.createElement('div');
    await act(async () => {
      const root = createRoot(container);
      root.render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      await captured.signUp('test@example.com', 'Password123!', 'Tester');
    });

    expect(profileTable.insert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Tester',
      plan_type: 'free',
      credits: 0,
    });
    expect(auditLog).toHaveBeenCalledWith('user_registered', 'user-1', 'user', 'user-1', { email: 'test@example.com' });
  });

  it('returns MFA challenge when sign in requires two-factor', async () => {
    (authMocks.signInWithPassword as any).mockResolvedValue({
      data: { session: null },
      error: { message: 'Requires MFA' },
    });
    (authMocks.mfa.listFactors as any).mockResolvedValue({
      data: { totp: [{ id: 'factor-1', status: 'verified' }] },
      error: null,
    });
    (authMocks.mfa.challenge as any).mockResolvedValue({
      data: { id: 'challenge-1' },
      error: null,
    });

    let result: { mfaChallenge?: MfaChallengeState } = {};

    const Consumer = () => {
      const ctx = useAuth();
      useEffect(() => {
        result = ctx;
      }, [ctx]);
      return null;
    };

    const container = document.createElement('div');
    await act(async () => {
      const root = createRoot(container);
      root.render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );
      await Promise.resolve();
    });

    let signInResponse;
    await act(async () => {
      signInResponse = await (result as any).signIn('mfa@example.com', 'Secret123!');
    });

    expect(signInResponse.mfaChallenge).toEqual({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      email: 'mfa@example.com',
    });
  });
});
