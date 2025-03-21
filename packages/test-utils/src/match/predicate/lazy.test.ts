import { describe, expect, it } from 'vitest';

import { lazy } from './lazy';

describe('lazy', () => {
  it('defers execution of the inner predicate until evaluated', () => {
    let condition = false;
    const checkCondition = lazy((input: boolean) => input === condition);

    // The predicate should reference the current value of condition when evaluated
    expect(checkCondition(true)).toBe(false);

    // Change the condition and test again
    condition = true;
    expect(checkCondition(true)).toBe(true);

    // Change the condition once more
    condition = false;
    expect(checkCondition(true)).toBe(false);
  });

  it('works with predicates that reference runtime values', () => {
    const values: Array<number> = [];
    const isInArray = lazy((input: number) => values.includes(input));

    // Initially, no values in the array
    expect(isInArray(42)).toBe(false);

    // Add the value to the array
    values.push(42);
    expect(isInArray(42)).toBe(true);

    // Add another value
    values.push(100);
    expect(isInArray(100)).toBe(true);
    expect(isInArray(200)).toBe(false);
  });

  it('works with object predicates', () => {
    let threshold = 50;
    const config = { enabled: false };

    const isEligible = lazy((user: { score: number }) => config.enabled && user.score > threshold);

    // Test when config is disabled
    expect(isEligible({ score: 75 })).toBe(false);

    // Enable the config
    config.enabled = true;
    expect(isEligible({ score: 75 })).toBe(true);
    expect(isEligible({ score: 25 })).toBe(false);

    // Change the threshold
    threshold = 80;
    expect(isEligible({ score: 75 })).toBe(false);
    expect(isEligible({ score: 85 })).toBe(true);
  });

  it('captures the predicate at creation time but evaluates at runtime', () => {
    // Create different predicates
    const originalPredicate = (n: number) => n > 10;

    // Create a lazy predicate with the original test
    const lazyPredicate = lazy(originalPredicate);

    // Test original behavior
    expect(lazyPredicate(5)).toBe(false);
    expect(lazyPredicate(15)).toBe(true);
  });
});
