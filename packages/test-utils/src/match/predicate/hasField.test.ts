import { describe, expect, it } from 'vitest';

import { hasField } from './hasField';

describe('hasField', () => {
  it('checks if an object field meets a predicate condition', () => {
    interface Person {
      age: number;
      name: string;
    }

    // Define predicate for testing a specific field
    const hasPositiveAge = hasField<Person, 'age'>('age', (age) => age > 0);

    // Test with objects that should match
    expect(hasPositiveAge({ age: 25, name: 'John' })).toBe(true);
    expect(hasPositiveAge({ age: 1, name: 'Baby' })).toBe(true);

    // Test with objects that should not match
    expect(hasPositiveAge({ age: 0, name: 'Newborn' })).toBe(false);
    expect(hasPositiveAge({ age: -5, name: 'Invalid' })).toBe(false);
  });

  it('works with nested predicates', () => {
    interface Person {
      name: string;
      age: number;
    }

    // Define predicate that checks if name starts with 'J'
    const nameStartsWithJ = hasField<Person, 'name'>(
      'name',
      (name) => typeof name === 'string' && name.startsWith('J'),
    );

    // Test with matching objects
    expect(nameStartsWithJ({ name: 'John', age: 30 })).toBe(true);
    expect(nameStartsWithJ({ name: 'Jane', age: 25 })).toBe(true);

    // Test with non-matching objects
    expect(nameStartsWithJ({ name: 'Bob', age: 40 })).toBe(false);
    expect(nameStartsWithJ({ name: '', age: 20 })).toBe(false);
  });

  it('works with boolean predicates', () => {
    interface User {
      active: boolean;
      name: string;
    }

    // Define predicate that checks if user is active
    const isActive = hasField<User, 'active'>('active', (active) => active === true);

    // Test with matching objects
    expect(isActive({ active: true, name: 'John' })).toBe(true);

    // Test with non-matching objects
    expect(isActive({ active: false, name: 'Jane' })).toBe(false);

    // Using type assertion for undefined case
    const invalidUser = { active: undefined, name: 'Bob' } as unknown as User;
    expect(isActive(invalidUser)).toBe(false);
  });

  it('works with complex objects and nested fields', () => {
    interface User {
      profile: {
        contact: {
          email?: string;
        };
      };
    }

    // Define predicate for nested field
    const hasEmail = hasField<User['profile'], 'contact'>(
      'contact',
      hasField('email', (email) => typeof email === 'string' && email.includes('@')),
    );

    // Create a predicate for user profile
    const hasValidEmail = hasField<User, 'profile'>('profile', hasEmail);

    // Test with valid nested objects
    expect(
      hasValidEmail({
        profile: {
          contact: {
            email: 'test@example.com',
          },
        },
      }),
    ).toBe(true);

    // Test with invalid nested objects
    expect(
      hasValidEmail({
        profile: {
          contact: {
            email: 'invalid-email',
          },
        },
      }),
    ).toBe(false);

    expect(
      hasValidEmail({
        profile: {
          contact: {},
        },
      }),
    ).toBe(false);
  });
});
