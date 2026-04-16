import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { useAuthStore } from '../../store/authStore';

jest.mock('../../api/authApi', () => ({
  login: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../api/usersApi', () => ({
  getProfile: jest.fn().mockResolvedValue({ id: 1, email: 'a@b.com', role: 'ADMIN', businessId: 10 }),
}));

jest.mock('../../api/businessApi', () => ({
  getBusinessById: jest.fn().mockResolvedValue({ id: 10, instituteName: 'Demo' }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      business: null,
      isBootstrapping: false,
      bootstrapError: null,
    } as any);
  });

  test('shows inline validation error when empty', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Login'));
    expect(getByText('Email and password are required.')).toBeTruthy();
  });

  test('logs in and stores profile', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'secret');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe('a@b.com');
      expect(useAuthStore.getState().business?.id).toBe(10);
    });
  });
});

