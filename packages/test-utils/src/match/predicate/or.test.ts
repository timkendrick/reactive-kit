import { describe, expect, it } from 'vitest';

import { or } from './or';

describe('or', () => {
  it('returns true when at least one predicate returns true', () => {
    // Define simple predicates
    const isEven = (n: number) => n % 2 === 0;
    const isPositive = (n: number) => n > 0;
    const isGreaterThan10 = (n: number) => n > 10;

    // Combine predicates with OR
    const isEvenOrPositiveOrGreaterThan10 = or(isEven, isPositive, isGreaterThan10);

    // Test with values that satisfy at least one condition
    expect(isEvenOrPositiveOrGreaterThan10(2)).toBe(true); // Even, positive, but not > 10
    expect(isEvenOrPositiveOrGreaterThan10(3)).toBe(true); // Not even, but positive
    expect(isEvenOrPositiveOrGreaterThan10(12)).toBe(true); // Even, positive, and > 10
    expect(isEvenOrPositiveOrGreaterThan10(-2)).toBe(true); // Even, but not positive or > 10
    expect(isEvenOrPositiveOrGreaterThan10(15)).toBe(true); // Not even, but positive and > 10

    // Test with values that fail all conditions
    expect(isEvenOrPositiveOrGreaterThan10(-1)).toBe(false); // Not even, not positive, not > 10
    expect(isEvenOrPositiveOrGreaterThan10(-3)).toBe(false); // Not even, not positive, not > 10
  });

  it('returns false for empty predicates', () => {
    // With no predicates, or() should return false for any value
    const emptyOr = or();
    expect(emptyOr(42)).toBe(false);
    expect(emptyOr('hello')).toBe(false);
    expect(emptyOr(null)).toBe(false);
  });

  it('works with complex object predicates', () => {
    // Define predicates for object properties
    const isPremium = (obj: Record<string, unknown>) => obj.tier === 'premium';
    const hasHighScore = (obj: Record<string, unknown>) =>
      typeof obj.score === 'number' && obj.score > 90;
    const isAdmin = (obj: Record<string, unknown>) => obj.role === 'admin';

    const canAccessFeature = or(isPremium, hasHighScore, isAdmin);

    // Test with objects that satisfy at least one condition
    expect(
      canAccessFeature({
        tier: 'premium',
        score: 70,
        role: 'user',
      }),
    ).toBe(true); // Premium user

    expect(
      canAccessFeature({
        tier: 'basic',
        score: 95,
        role: 'user',
      }),
    ).toBe(true); // High-scoring user

    expect(
      canAccessFeature({
        tier: 'basic',
        score: 60,
        role: 'admin',
      }),
    ).toBe(true); // Admin user

    // Test with objects that fail all conditions
    expect(
      canAccessFeature({
        tier: 'basic',
        score: 70,
        role: 'user',
      }),
    ).toBe(false); // Basic user with average score
  });
});
