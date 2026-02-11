import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUsageStore } from './usageStore';

describe('usageStore', () => {
  beforeEach(() => {
    useUsageStore.setState({
      usedThisMonth: 0,
      currentMonth: '2026-02',
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have correct initial state', () => {
    const state = useUsageStore.getState();
    expect(state.usedThisMonth).toBe(0);
    expect(state.currentMonth).toBe('2026-02');
  });

  it('should record usage and increment count', () => {
    useUsageStore.getState().recordUsage();
    expect(useUsageStore.getState().usedThisMonth).toBe(1);
    useUsageStore.getState().recordUsage();
    expect(useUsageStore.getState().usedThisMonth).toBe(2);
  });

  it('should report canGenerate correctly for free tier', () => {
    const { canGenerate } = useUsageStore.getState();
    expect(canGenerate('free')).toBe(true);

    // Use all 10 free credits
    useUsageStore.setState({ usedThisMonth: 10 });
    expect(useUsageStore.getState().canGenerate('free')).toBe(false);
  });

  it('should report canGenerate correctly for pro tier', () => {
    useUsageStore.setState({ usedThisMonth: 499 });
    expect(useUsageStore.getState().canGenerate('pro')).toBe(true);

    useUsageStore.setState({ usedThisMonth: 500 });
    expect(useUsageStore.getState().canGenerate('pro')).toBe(false);
  });

  it('should always allow business tier', () => {
    useUsageStore.setState({ usedThisMonth: 999999 });
    expect(useUsageStore.getState().canGenerate('business')).toBe(true);
  });

  it('should return correct remaining credits for free tier', () => {
    useUsageStore.setState({ usedThisMonth: 3 });
    expect(useUsageStore.getState().getRemaining('free')).toBe(7);

    useUsageStore.setState({ usedThisMonth: 10 });
    expect(useUsageStore.getState().getRemaining('free')).toBe(0);

    useUsageStore.setState({ usedThisMonth: 15 });
    expect(useUsageStore.getState().getRemaining('free')).toBe(0);
  });

  it('should return correct remaining credits for pro tier', () => {
    useUsageStore.setState({ usedThisMonth: 100 });
    expect(useUsageStore.getState().getRemaining('pro')).toBe(400);
  });

  it('should return Infinity for business tier remaining', () => {
    useUsageStore.setState({ usedThisMonth: 100 });
    expect(useUsageStore.getState().getRemaining('business')).toBe(Infinity);
  });

  it('should return correct limits', () => {
    const { getLimit } = useUsageStore.getState();
    expect(getLimit('free')).toBe(10);
    expect(getLimit('pro')).toBe(500);
    expect(getLimit('business')).toBe(Infinity);
  });

  it('should reset usage when month changes via recordUsage', () => {
    useUsageStore.setState({ usedThisMonth: 8, currentMonth: '2026-01' });

    // Current time is Feb 2026
    const { recordUsage } = useUsageStore.getState();
    recordUsage();

    const state = useUsageStore.getState();
    expect(state.usedThisMonth).toBe(1);
    expect(state.currentMonth).toBe('2026-02');
  });

  it('should reset usage when month changes via resetIfNewMonth', () => {
    useUsageStore.setState({ usedThisMonth: 8, currentMonth: '2026-01' });

    const { resetIfNewMonth } = useUsageStore.getState();
    resetIfNewMonth();

    const state = useUsageStore.getState();
    expect(state.usedThisMonth).toBe(0);
    expect(state.currentMonth).toBe('2026-02');
  });

  it('should not reset when month has not changed', () => {
    useUsageStore.setState({ usedThisMonth: 5, currentMonth: '2026-02' });

    const { resetIfNewMonth } = useUsageStore.getState();
    resetIfNewMonth();

    expect(useUsageStore.getState().usedThisMonth).toBe(5);
  });
});
