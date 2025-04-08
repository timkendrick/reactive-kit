import { describe, expect, it } from 'vitest';

import { matchPattern } from '../match';
import { predicate } from '../pattern/predicate';
import type { PatternMatchResults } from '../types';

import { any } from './any';

describe(any, () => {
  it('should match any item', () => {
    const pattern = predicate(any());
    const input: string[] = ['a', 'b', 'c'];
    const actual = matchPattern(input, pattern);
    const expected: PatternMatchResults<string> = [{ input, nextIndex: 1, captures: [] }];
    expect(actual).toEqual(expected);
  });
});
