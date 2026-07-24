import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { tokenService } from '../services/tokenService';

vi.mock('../api/authApi');
vi.mock('../services/tokenService');
vi.mock('react-hot-toast');
vi.mock('../config', () => ({
  BYPASS_AUTH: false,
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('unauthenticated initial state when no token exists', async () => {
    vi.mocked(tokenService.isAuthenticated).mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assuming checkAuth triggers async, we might need a small wait, but since tokenService is false, it's synchronous in setting loading to false.
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('successful login transitions to authenticated and stores tokens', async () => {
    vi.mocked(tokenService.isAuthenticated).mockReturnValue(false);
    const mockUser = {
      user_id: '1',
      name: 'Test',
      email: 'test@example.com',
      username: 'test',
      role: 'user',
      is_active: true,
      created_at: '',
      updated_at: '',
    };
    
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'access123',
      refresh_token: 'refresh123',
      user: mockUser as any,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' });
    });

    expect(authApi.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
    expect(tokenService.setTokens).toHaveBeenCalledWith('access123', 'refresh123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('failed login stays unauthenticated and sets error', async () => {
    vi.mocked(tokenService.isAuthenticated).mockReturnValue(false);
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'wrong' });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('logout clears state and tokens', async () => {
    vi.mocked(tokenService.isAuthenticated).mockReturnValue(false);
    vi.mocked(authApi.logout).mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(tokenService.clearTokens).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
