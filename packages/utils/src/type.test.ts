import { describe, expect, test } from 'vitest';

import { nonNull, noop, unreachable } from './type';

describe(unreachable, () => {
  test('throws', () => {
    expect(() => unreachable(undefined as never)).toThrow('Unexpected value: undefined');
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

describe(noop, () => {
  test('returns undefined', () => {
    expect(noop()).toBeUndefined();
  });
});
