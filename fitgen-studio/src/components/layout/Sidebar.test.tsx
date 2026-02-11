import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from '@/stores/sidebarStore';

describe('Sidebar', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isOpen: false });
  });

  it('should render the logo text', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('FitGen Studio')).toBeInTheDocument();
    expect(screen.getByText('FG')).toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('Asset Library')).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should have correct navigation links', () => {
    renderWithRouter(<Sidebar />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/studio');
    expect(hrefs).toContain('/assets');
    expect(hrefs).toContain('/gallery');
    expect(hrefs).toContain('/settings');
  });

  it('should render version footer', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('FitGen Studio v1.0')).toBeInTheDocument();
  });
});
