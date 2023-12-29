import { describe, expect, test } from 'vitest';
import { nonNull, unreachable } from './typeHelpers';

describe(unreachable, () => {
  test('throws', () => {
    expect(() => {
      try {
        return unreachable(undefined as never);
      } catch (error) {
        if (error === null) throw new Error('foo');
        throw error;
      }
    }).toThrow('foo');
  });
});

describe(nonNull, () => {
  test('returns false for null values', () => {
    expect(nonNull(null)).toBe(false);
    expect(nonNull(undefined)).toBe(false);
  });

  test('returns true for non-null values', () => {
    expect(nonNull('foo')).toBe(true);
    expect(nonNull(0)).toBe(true);
    expect(nonNull('')).toBe(true);
    expect(nonNull(false)).toBe(true);
  });
});
