import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import { predicate } from '../pattern/predicate';
import type { PatternMatchResults } from '../types';

import { any } from './any';

describe(any, () => {
  it('should match any item', () => {
    const pattern = predicate(any());
    const input: Array<string> = ['a', 'b', 'c'];
    const actual = pattern.match(initialMatchState(input));
    const expected: PatternMatchResults<string> = [{ input, nextIndex: 1, refContext: new Map() }];
    expect(actual).toEqual(expected);
  });
});
