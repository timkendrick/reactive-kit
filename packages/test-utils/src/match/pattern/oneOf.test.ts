import { describe, it, expect } from 'vitest';
import { oneOf } from './oneOf';
import { PatternMatchResults } from '../types';
import { predicate } from './predicate';
import { matchPattern } from '../match';

describe(oneOf, () => {
  it('should match any of the patterns', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isOdd = (n: number) => n % 2 !== 0;
    const pattern = oneOf(predicate(isEven), predicate(isOdd));
    {
      const input = [1, 2, 3, 4, 5];
      const actual = matchPattern(input, pattern);
      const expected: PatternMatchResults<number> = [{ input, nextIndex: 1, captures: [] }];
      expect(actual).toEqual(expected);
    }
    {
      const input = [2, 4, 6, 8, 10];
      const actual = matchPattern(input, pattern);
      const expected: PatternMatchResults<number> = [{ input, nextIndex: 1, captures: [] }];
      expect(actual).toEqual(expected);
    }
  });

  it('should not match items that do not satisfy any of the patterns', () => {
    const isDivisibleBy3 = (n: number) => n % 3 === 0;
    const isDivisibleBy5 = (n: number) => n % 5 === 0;
    const pattern = oneOf(predicate(isDivisibleBy3), predicate(isDivisibleBy5));
    {
      const input = [1, 2, 4, 7, 8];
      const actual = matchPattern(input, pattern);
      const expected: PatternMatchResults<number> = [];
      expect(actual).toEqual(expected);
    }
  });
});
