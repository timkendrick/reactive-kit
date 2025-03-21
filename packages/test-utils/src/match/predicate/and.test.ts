import { describe, expect, it } from 'vitest';

import { and } from './and';

describe('and', () => {
  it('returns true when all predicates return true', () => {
    // Define simple predicates
    const isEven = (n: number) => n % 2 === 0;
    const isPositive = (n: number) => n > 0;
    const isLessThan10 = (n: number) => n < 10;

    // Combine predicates with AND
    const isEvenPositiveAndLessThan10 = and(isEven, isPositive, isLessThan10);

    // Test with values that satisfy all conditions
    expect(isEvenPositiveAndLessThan10(2)).toBe(true);
    expect(isEvenPositiveAndLessThan10(4)).toBe(true);
    expect(isEvenPositiveAndLessThan10(8)).toBe(true);

    // Test with values that fail one or more conditions
    expect(isEvenPositiveAndLessThan10(1)).toBe(false); // Not even
    expect(isEvenPositiveAndLessThan10(-2)).toBe(false); // Not positive
    expect(isEvenPositiveAndLessThan10(12)).toBe(false); // Not less than 10
    expect(isEvenPositiveAndLessThan10(-3)).toBe(false); // Not even, not positive
  });

  it('returns true for empty predicates', () => {
    // With no predicates, and() should return true for any value
    const emptyAnd = and();
    expect(emptyAnd(42)).toBe(true);
    expect(emptyAnd('hello')).toBe(true);
    expect(emptyAnd(null)).toBe(true);
  });

  it('works with complex object predicates', () => {
    // Define predicates for object properties
    const hasName = (obj: Record<string, unknown>) => Boolean(obj.name);
    const hasPositiveAge = (obj: Record<string, unknown>) =>
      typeof obj.age === 'number' && obj.age > 0;
    const isActive = (obj: Record<string, unknown>) => obj.active === true;

    const isValidUser = and(hasName, hasPositiveAge, isActive);

    // Test with valid user
    expect(
      isValidUser({
        name: 'John',
        age: 30,
        active: true,
      }),
    ).toBe(true);

    // Test with invalid users
    expect(
      isValidUser({
        age: 30,
        active: true,
      }),
    ).toBe(false); // Missing name

    expect(
      isValidUser({
        name: 'John',
        age: -5,
        active: true,
      }),
    ).toBe(false); // Invalid age

    expect(
      isValidUser({
        name: 'John',
        age: 30,
        active: false,
      }),
    ).toBe(false); // Not active
  });
});
