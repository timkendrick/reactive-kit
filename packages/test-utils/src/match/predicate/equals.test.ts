import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import { predicate } from '../pattern/predicate';
import type { PatternMatchResults } from '../types';

import { equals } from './equals';

describe(equals, () => {
  it('should match identical items', () => {
    const foo: symbol = Symbol('foo');
    const bar: symbol = Symbol('bar');
    const baz: symbol = Symbol('baz');
    const pattern = predicate(equals(foo));
    {
      const input: Array<symbol> = [foo, bar, baz];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<symbol> = [{ input, nextIndex: 1, captures: [] }];
      expect(actual).toEqual(expected);
    }
  });

  it('should not match different items', () => {
    const foo: symbol = Symbol('foo');
    const bar: symbol = Symbol('bar');
    const baz: symbol = Symbol('baz');
    const pattern = predicate(equals(foo));
    {
      const input: Array<symbol> = [bar, baz];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<symbol> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should perform a deep equality check', () => {
    const foo = { value: 'foo' };
    const bar = { value: 'foo' };
    const baz = { value: 'foo' };
    const pattern = predicate(equals(foo));
    {
      const input: Array<{ value: string }> = [bar, baz];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<{ value: string }> = [
        { input, nextIndex: 1, captures: [] },
      ];
      expect(actual).toEqual(expected);
    }
  });
});
