import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen, userEvent } from '@/test/test-utils';
import { RegisterPage } from './RegisterPage';
import { useAuthStore } from '@/stores/authStore';

describe('RegisterPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should render the registration form', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    // "Create account" appears in both heading and button
    const createAccountElements = screen.getAllByText(/create account/i);
    expect(createAccountElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render create account button', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render sign-in link', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('should show password mismatch error', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.type(screen.getByLabelText('Confirm Password'), 'password2');

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('should disable submit when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.type(screen.getByLabelText('Confirm Password'), 'password2');

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('should enable submit when passwords match', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText('Name'), 'Test');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.type(screen.getByLabelText('Confirm Password'), 'password1');

    expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled();
  });
});
