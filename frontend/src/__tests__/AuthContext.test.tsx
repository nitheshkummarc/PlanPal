import React from 'react';
import { renderHook, act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';
import PublicRoute from '../components/common/PublicRoute';
import { authApi } from '../api/authApi';
import { tokenService } from '../services/tokenService';

vi.mock('../api/authApi');
vi.mock('../services/tokenService');
vi.mock('react-hot-toast');

const mockUser = {
  user_id: '1',
  name: 'Test',
  email: 'test@example.com',
  username: 'test',
  bio: null,
  profile_image_url: null,
  interests: [],
  role: 'user' as const,
  created_at: '',
  updated_at: '',
};

const httpError = (status: number) => {
  const error = new AxiosError('Request failed');
  error.response = { data: {}, status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
  return error;
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('unauthenticated initial state when no token exists', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(authApi.getProfile).not.toHaveBeenCalled();
  });

  it('successful login transitions to authenticated and stores tokens', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(false);
    vi.mocked(authApi.login).mockResolvedValue({
      message: 'Login successful',
      access_token: 'access123',
      refresh_token: 'refresh123',
      user: mockUser,
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
    vi.mocked(tokenService.hasSession).mockReturnValue(false);
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    let outcome: Awaited<ReturnType<typeof result.current.login>> | undefined;
    await act(async () => {
      outcome = await result.current.login({ email: 'test@example.com', password: 'wrong' });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(outcome).toEqual({ success: false, error: 'Login failed' });
  });

  it('logout clears state and tokens', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(false);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(tokenService.clearTokens).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    // Route guards show a spinner while loading; it must not stay stuck after logout
    expect(result.current.loading).toBe(false);
  });

  it('keeps the stored session when the server cannot be reached', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(true);
    vi.mocked(authApi.getProfile).mockRejectedValue(new AxiosError('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(tokenService.clearTokens).not.toHaveBeenCalled();
  });

  it('discards tokens the server rejects', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(true);
    vi.mocked(authApi.getProfile).mockRejectedValue(httpError(401));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(tokenService.clearTokens).toHaveBeenCalled();
  });
});

describe('restoring a session on page load', () => {
  const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

  const renderAt = (path: string) =>
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<PublicRoute><div>login page</div></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><div>dashboard</div></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><div>event page</div></ProtectedRoute>} />
          </Routes>
          <Where />
        </MemoryRouter>
      </AuthProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays on the requested page when the session is valid', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(true);
    vi.mocked(authApi.getProfile).mockResolvedValue({ user: mockUser });

    renderAt('/events/abc');

    expect(await screen.findByText('event page')).toBeInTheDocument();
    expect(screen.getByTestId('where').textContent).toBe('/events/abc');
  });

  it('asks the server when only the refresh token is still valid', async () => {
    // hasSession() is true for an expired access token with a valid refresh token;
    // the axios interceptor renews the access token during getProfile()
    vi.mocked(tokenService.hasSession).mockReturnValue(true);
    vi.mocked(authApi.getProfile).mockResolvedValue({ user: mockUser });

    renderAt('/events/abc');

    expect(await screen.findByText('event page')).toBeInTheDocument();
    expect(authApi.getProfile).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-out visitor to login', async () => {
    vi.mocked(tokenService.hasSession).mockReturnValue(false);

    renderAt('/events/abc');

    expect(await screen.findByText('login page')).toBeInTheDocument();
  });
});
