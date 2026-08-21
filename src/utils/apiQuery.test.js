import { describe, it, expect } from 'vitest';
import { buildWhereInParam } from '@/utils/apiQuery';

describe('buildWhereInParam', () => {
  it('returns empty string for empty input', () => {
    expect(buildWhereInParam([])).toBe('');
    expect(buildWhereInParam(null)).toBe('');
    expect(buildWhereInParam(undefined)).toBe('');
  });

  it('encodes single id', () => {
    expect(buildWhereInParam(['abc'])).toBe('where[id][in]=abc');
  });

  it('joins multiple ids with comma', () => {
    expect(buildWhereInParam(['a', 'b', 'c'])).toBe('where[id][in]=a,b,c');
  });

  it('encodes special characters', () => {
    expect(buildWhereInParam(['a b', 'c/d'])).toBe('where[id][in]=a%20b,c%2Fd');
  });
});
