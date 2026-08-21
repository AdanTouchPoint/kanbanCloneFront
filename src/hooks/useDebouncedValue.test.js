import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 50));
    expect(result.current).toBe('hello');
  });

  it('updates after delay', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('b');
    vi.useRealTimers();
  });

  it('cancels previous timer when value changes quickly', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    rerender({ value: 'c' });
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('a');
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('c');
    vi.useRealTimers();
  });
});

import { vi } from 'vitest';
