import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import type { PatternMatchResults } from '../types';

import { predicate } from './predicate';

describe(predicate, () => {
  it('should match items that satisfy the predicate', () => {
    const isEven = (n: number) => n % 2 === 0;
    const pattern = predicate(isEven);

    const input: Array<number> = [2, 4, 6];
    const actual = pattern.match(initialMatchState(input));
    const expected: PatternMatchResults<number> = [{ input, nextIndex: 1, refContext: new Map() }];
    expect(actual).toEqual(expected);
  });

  it('should not match items that do not satisfy the predicate', () => {
    const isEven = (n: number) => n % 2 === 0;
    const pattern = predicate(isEven);

    const input: Array<number> = [1, 3, 5];
    const actual = pattern.match(initialMatchState(input));
    const expected: PatternMatchResults<number> = [];
    expect(actual).toEqual(expected);
  });
});
