import { describe, it, expect, beforeEach } from 'vitest';
import { useSidebarStore } from './sidebarStore';

describe('sidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isOpen: false });
  });

  it('should start closed', () => {
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it('should toggle open', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it('should toggle closed', () => {
    useSidebarStore.setState({ isOpen: true });
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it('should open', () => {
    useSidebarStore.getState().open();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it('should close', () => {
    useSidebarStore.setState({ isOpen: true });
    useSidebarStore.getState().close();
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });
});
