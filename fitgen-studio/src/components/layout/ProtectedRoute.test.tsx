import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';
import { Route, Routes } from 'react-router-dom';

function renderProtected(initialPath = '/') {
  return renderWithRouter(
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<div>Login Page</div>} />
    </Routes>,
    { routerProps: { initialEntries: [initialPath] } },
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should redirect to login when not authenticated', () => {
    renderProtected();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });
    renderProtected();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
