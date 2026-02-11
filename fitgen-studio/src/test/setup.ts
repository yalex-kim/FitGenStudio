import '@testing-library/jest-dom/vitest'

// Mock IntersectionObserver for jsdom (used by GalleryPage infinite scroll)
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    // callback stored for potential test use
    void _callback;
  }
  observe() { return; }
  unobserve() { return; }
  disconnect() { return; }
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});
