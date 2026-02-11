import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen, userEvent } from '@/test/test-utils';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '@/stores/authStore';

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should render the login form', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render Google sign-in button', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('should render sign-up link', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/register');
  });

  it('should show FG logo', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('FG')).toBeInTheDocument();
  });

  it('should allow typing in email and password fields', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'mypassword');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('mypassword');
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    // Button text changes during loading
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });
});
