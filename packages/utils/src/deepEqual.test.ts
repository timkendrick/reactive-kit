import { describe, expect, test } from 'vitest';

import { deepEqual } from './deepEqual';

describe(deepEqual, () => {
  // Primitives
  test('should return true for equal primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    const sym = Symbol('a');
    expect(deepEqual(sym, sym)).toBe(true);
    expect(deepEqual(BigInt(1), BigInt(1))).toBe(true);
  });

  test('should return false for unequal primitives', () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(Symbol('a'), Symbol('a'))).toBe(false); // Symbols are unique
    expect(deepEqual(Symbol('a'), Symbol('b'))).toBe(false);
    expect(deepEqual(BigInt(1), BigInt(2))).toBe(false);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(0, false)).toBe(false);
  });

  // Objects
  test('should return true for equal simple objects', () => {
    expect(deepEqual({ a: 1, b: '2' }, { a: 1, b: '2' })).toBe(true);
    expect(deepEqual({ b: '2', a: 1 }, { a: 1, b: '2' })).toBe(true); // Order shouldn't matter
  });

  test('should return false for unequal simple objects', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(deepEqual({ a: 1, b: '2' }, { a: 1 })).toBe(false);
  });

  test('should return true for equal nested objects', () => {
    expect(deepEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } })).toBe(true);
  });

  test('should return false for unequal nested objects', () => {
    expect(deepEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 4 } })).toBe(false);
    expect(deepEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { d: 3 } })).toBe(false);
  });

  // Arrays
  test('should return true for equal arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(deepEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true);
    expect(deepEqual([], [])).toBe(true);
  });

  test('should return false for unequal arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, { a: 2 }], [1, { a: 3 }])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false); // Order matters
  });

  // Dates
  test('should return true for equal dates', () => {
    expect(deepEqual(new Date(2023, 1, 1), new Date(2023, 1, 1))).toBe(true);
  });

  test('should return false for unequal dates', () => {
    expect(deepEqual(new Date(2023, 1, 1), new Date(2023, 1, 2))).toBe(false);
  });

  // RegExps
  test('should return true for equal regexps', () => {
    expect(deepEqual(/abc/gi, /abc/gi)).toBe(true);
  });

  test('should return false for unequal regexps', () => {
    expect(deepEqual(/abc/g, /abc/i)).toBe(false); // Different flags
    expect(deepEqual(/abc/, /def/)).toBe(false); // Different source
  });

  // Sets
  test('should return true for equal sets', () => {
    expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
    expect(deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true); // Order doesn't matter
    expect(deepEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(false); // Deep equality not checked by default for set elements
  });

  test('should return false for unequal sets', () => {
    expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 4]))).toBe(false);
    expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2]))).toBe(false);
  });

  // Maps
  test('should return true for equal maps', () => {
    const map1 = new Map<string, number | object>([
      ['a', 1],
      ['b', { c: 2 }],
    ]);
    const map2 = new Map<string, number | object>([
      ['a', 1],
      ['b', { c: 2 }],
    ]);
    const map3 = new Map<string, number | object>([
      ['b', { c: 2 }],
      ['a', 1],
    ]); // Order doesn't matter for keys
    expect(deepEqual(map1, map2)).toBe(true);
    expect(deepEqual(map1, map3)).toBe(true);
  });

  test('should return false for unequal maps', () => {
    const map1 = new Map<string, number | object>([
      ['a', 1],
      ['b', { c: 2 }],
    ]);
    const map2 = new Map<string, number | object>([
      ['a', 1],
      ['b', { c: 3 }],
    ]); // Different value
    const map3 = new Map<string, number | object>([
      ['a', 1],
      ['c', { c: 2 }],
    ]); // Different key
    const map4 = new Map<string, number | object>([['a', 1]]); // Different size
    expect(deepEqual(map1, map2)).toBe(false);
    expect(deepEqual(map1, map3)).toBe(false);
    expect(deepEqual(map1, map4)).toBe(false);
  });

  // Mixed Types & Edge Cases
  test('should return false for different types', () => {
    expect(deepEqual({ a: 1 }, [1])).toBe(false);
    expect(deepEqual(new Date(), {})).toBe(false);
    expect(deepEqual(/a/, '/a/')).toBe(false);
    expect(deepEqual(new Set([1]), [1])).toBe(false);
    expect(deepEqual(new Map([['a', 1]]), { a: 1 })).toBe(false);
  });

  test('should handle complex nested structures', () => {
    const obj1 = {
      a: 1,
      b: [{ c: 'hello', d: new Date(1), e: new Set([1, 2]) }, { f: new Map([['g', null]]) }],
      h: /test/g,
    };
    const obj2 = {
      a: 1,
      b: [
        { c: 'hello', d: new Date(1), e: new Set([2, 1]) }, // Set order doesn't matter
        { f: new Map([['g', null]]) },
      ],
      h: /test/g,
    };
    const obj3 = {
      a: 1,
      b: [
        { c: 'hello', d: new Date(1), e: new Set([1, 3]) }, // Different set content
        { f: new Map([['g', null]]) },
      ],
      h: /test/g,
    };
    expect(deepEqual(obj1, obj2)).toBe(true);
    expect(deepEqual(obj1, obj3)).toBe(false);
  });

  test('should return true for functions (reference equality)', () => {
    const fn = () => {};
    expect(deepEqual(fn, fn)).toBe(true);
  });

  test('should return false for different functions', () => {
    const fn1 = () => {};
    const fn2 = () => {};
    expect(deepEqual(fn1, fn2)).toBe(false);
  });
});
