import { describe, it, expect } from 'vitest';
import { predicate } from './predicate';
import { PatternMatchResults } from '../types';
import { matchPattern } from '../match';

describe(predicate, () => {
  it('should match items that satisfy the predicate', () => {
    const isEven = (n: number) => n % 2 === 0;
    const pattern = predicate(isEven);

    const input: number[] = [2, 4, 6];
    const actual = matchPattern(input, pattern);
    const expected: PatternMatchResults<number> = [{ input, nextIndex: 1, captures: [] }];
    expect(actual).toEqual(expected);
  });

  it('should not match items that do not satisfy the predicate', () => {
    const isEven = (n: number) => n % 2 === 0;
    const pattern = predicate(isEven);

    const input: number[] = [1, 3, 5];
    const actual = matchPattern(input, pattern);
    const expected: PatternMatchResults<number> = [];
    expect(actual).toEqual(expected);
  });
});
