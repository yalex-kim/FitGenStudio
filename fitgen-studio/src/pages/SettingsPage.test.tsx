import { describe, it, expect } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('should render settings heading', () => {
    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render placeholder description', () => {
    renderWithRouter(<SettingsPage />);
    expect(
      screen.getByText(/account and subscription management coming soon/i),
    ).toBeInTheDocument();
  });
});
