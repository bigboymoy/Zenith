import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';

const {
  loginMock,
  navigateMock,
  addActivityMock,
  addXPMock,
  toastMock,
  onActivityAddedMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  navigateMock: vi.fn(),
  addActivityMock: vi.fn(),
  addXPMock: vi.fn(),
  toastMock: vi.fn(),
  onActivityAddedMock: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    currentUser: { uid: 'user_1' },
  }),
}));

vi.mock('../App', () => ({
  useApp: () => ({
    user: { uid: 'user_1' },
    toast: toastMock,
    onActivityAdded: onActivityAddedMock,
  }),
}));

vi.mock('../lib/firestore', () => ({
  firestoreActivities: {
    add: addActivityMock,
    update: vi.fn(),
    delete: vi.fn(),
  },
  firestoreUser: {
    addXP: addXPMock,
  },
  firestoreWorkoutTemplates: {
    getByUser: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  firestoreFeed: {
    fanOutActivityToFeed: vi.fn().mockResolvedValue(undefined),
  },
  firestoreOneRepMax: { set: vi.fn(), get: vi.fn() },
  runSegmentMatchingForActivity: vi.fn().mockResolvedValue(undefined),
}));

import Login from '../pages/Login';
import AddActivityModal from '../components/AddActivityModal';

describe('smoke: auth and log workout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMock.mockResolvedValue({ user: { uid: 'user_1' } });
    addActivityMock.mockResolvedValue(undefined);
    addXPMock.mockResolvedValue(undefined);
    onActivityAddedMock.mockResolvedValue(undefined);
  });

  it('logs in with valid credentials', async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByPlaceholderText('name@example.com'), 'smoke@test.com');

    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeTruthy();
    await user.type(passwordInput, 'test-password');

    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('smoke@test.com', 'test-password');
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });

  it('logs a workout after authentication', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AddActivityModal onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('e.g. Morning Run'), 'Morning Run');
    await user.type(screen.getByPlaceholderText('45'), '45');
    await user.click(screen.getByRole('button', { name: /^Log Workout$/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Workout logged!' })).toBeInTheDocument();
    });
    expect(addActivityMock).toHaveBeenCalledTimes(1);
    expect(addActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        sport: 'run',
        title: 'Morning Run',
      }),
    );
    expect(addXPMock).toHaveBeenCalledWith('user_1', expect.any(Number));

    await user.click(screen.getByRole('button', { name: /^Done$/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
