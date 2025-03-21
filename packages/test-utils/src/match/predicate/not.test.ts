import { describe, expect, it } from 'vitest';

import { not } from './not';

describe('not', () => {
  it('returns true when the predicate returns false', () => {
    // Define simple predicates
    const isEven = (n: number) => n % 2 === 0;
    const isOdd = not(isEven);

    // Test with values that should return true (odd numbers)
    expect(isOdd(1)).toBe(true);
    expect(isOdd(3)).toBe(true);
    expect(isOdd(99)).toBe(true);

    // Test with values that should return false (even numbers)
    expect(isOdd(2)).toBe(false);
    expect(isOdd(0)).toBe(false);
    expect(isOdd(-4)).toBe(false);
  });

  it('returns false when the predicate returns true', () => {
    const isPositive = (n: number) => n > 0;
    const isNonPositive = not(isPositive);

    // Test with values that should return true (non-positive numbers)
    expect(isNonPositive(0)).toBe(true);
    expect(isNonPositive(-1)).toBe(true);
    expect(isNonPositive(-100)).toBe(true);

    // Test with values that should return false (positive numbers)
    expect(isNonPositive(1)).toBe(false);
    expect(isNonPositive(10)).toBe(false);
  });

  it('works with complex object predicates', () => {
    // Define a predicate for object properties
    const isPremiumUser = (obj: Record<string, unknown>) => obj.tier === 'premium';
    const isNonPremiumUser = not(isPremiumUser);

    // Test with premium users (should return false)
    expect(
      isNonPremiumUser({
        tier: 'premium',
        name: 'John',
      }),
    ).toBe(false);

    // Test with non-premium users (should return true)
    expect(
      isNonPremiumUser({
        tier: 'basic',
        name: 'Jane',
      }),
    ).toBe(true);

    expect(
      isNonPremiumUser({
        tier: 'free',
        name: 'Bob',
      }),
    ).toBe(true);
  });

  it('can be nested with other predicates', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isPositive = (n: number) => n > 0;

    // Not even and not positive = odd and negative/zero
    const isOddAndNonPositive = (n: number) => not(isEven)(n) && not(isPositive)(n);

    expect(isOddAndNonPositive(-1)).toBe(true); // Odd and negative
    expect(isOddAndNonPositive(-3)).toBe(true); // Odd and negative

    expect(isOddAndNonPositive(-2)).toBe(false); // Even and negative
    expect(isOddAndNonPositive(0)).toBe(false); // Even and zero
    expect(isOddAndNonPositive(1)).toBe(false); // Odd but positive
    expect(isOddAndNonPositive(2)).toBe(false); // Even and positive
  });
});
