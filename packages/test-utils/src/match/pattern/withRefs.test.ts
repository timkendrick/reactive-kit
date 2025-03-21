import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import { sequence } from '../pattern';
import { and, any, equals, hasField, lazy } from '../predicate';
import type { PatternMatchResults } from '../types';

import { withRefs } from './withRefs';

describe(withRefs, () => {
  it('should capture a value with captureRef and match it later with ref', () => {
    // 1. Define pattern using withRefs
    const pattern = withRefs<number>((helpers) => {
      const { createRef, refPredicate, captureRef, ref } = helpers;

      // 2. Create a reference variable
      const valueRef = createRef<number>();

      // 3. Define the sequence using refPredicate and ref
      return sequence(
        // Use refPredicate() to wrap the predicate using captureRef
        refPredicate(captureRef(valueRef, equals(42))),
        // Use refPredicate() to wrap the ref predicate
        refPredicate(ref(valueRef)),
      );
    });

    // Test case 1: Matching input
    {
      const input = [42, 42, 99]; // First two items should match
      const actual = pattern.match(initialMatchState(input));
      // Expectation: Matches the first two items
      const expected: PatternMatchResults<number> = [
        { input, nextIndex: 2, refContext: expect.any(Map) }, // Captures managed internally by withRefs
      ];
      expect(actual).toEqual(expected);
      // Check context details separately
      expect(actual[0].refContext).toBeInstanceOf(Map);
      expect(actual[0].refContext.size).toBe(1);
      expect(Array.from(actual[0].refContext.values())).toEqual([42]);
    }

    // Test case 2: Non-matching input (second item differs)
    {
      const input = [42, 99, 42]; // Second item doesn't match ref
      const actual = pattern.match(initialMatchState(input));
      // Expectation: No match
      const expected: PatternMatchResults<number> = [];
      expect(actual).toEqual(expected);
    }

    // Test case 3: Non-matching input (first item doesn't match capture predicate)
    {
      const input = [10, 10, 99]; // First item fails captureRef's inner predicate
      const actual = pattern.match(initialMatchState(input));
      // Expectation: No match
      const expected: PatternMatchResults<number> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should only capture value if inner predicate of captureRef succeeds', () => {
    const pattern = withRefs<number>((helpers) => {
      const { createRef, refPredicate, captureRef, ref } = helpers;
      const valueRef = createRef<number>();

      return sequence(
        // Step 1: Capture ONLY if the value is 10, using refPredicate
        refPredicate(captureRef(valueRef, equals(10))),
        // Step 2: Match the captured value using refPredicate and ref
        refPredicate(ref(valueRef)),
      );
    });

    // Test Case 1: Matching input (capture succeeds)
    {
      const input = [10, 10, 20];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number> = [
        { input, nextIndex: 2, refContext: expect.any(Map) },
      ];
      expect(actual).toEqual(expected);
      // Check context details separately
      expect(actual[0].refContext).toBeInstanceOf(Map);
      expect(actual[0].refContext.size).toBe(1);
      expect(Array.from(actual[0].refContext.values())).toEqual([10]);
    }

    // Test Case 2: Non-matching input (capture fails)
    {
      const input = [99, 10, 20]; // First item is not 10
      const actual = pattern.match(initialMatchState(input));
      // Expectation: No match because captureRef's inner predicate fails
      const expected: PatternMatchResults<number> = [];
      expect(actual).toEqual(expected);
    }

    // Test Case 3: Non-matching input (second item mismatch)
    {
      const input = [10, 99, 20]; // First item is 10, but second doesn't match ref
      const actual = pattern.match(initialMatchState(input));
      // Expectation: No match because second predicate fails
      const expected: PatternMatchResults<number> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should retrieve captured value using retrieveRef within a lazy predicate', () => {
    // Define a simple object type for the test
    type TestObject = { id: string; value?: number };

    const pattern = withRefs<TestObject>((helpers) => {
      const { createRef, refPredicate, captureRef, retrieveRef } = helpers;

      const objRef = createRef<TestObject>();

      return sequence(
        // Step 1: Capture the first object (any object with a non-empty id)
        refPredicate(captureRef(objRef, (val) => val.id !== '')),
        // Step 2: Match second object if its id is derived from the captured one
        refPredicate(
          hasField(
            'id',
            lazy((idValue: string) => idValue === retrieveRef(objRef).id + '_suffix'),
          ),
        ),
      );
    });

    // Test Case 1: Matching input
    {
      const input: Array<TestObject> = [{ id: 'A' }, { id: 'A_suffix' }, { id: 'B' }];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<TestObject> = [
        { input, nextIndex: 2, refContext: expect.any(Map) },
      ];
      expect(actual).toEqual(expected);
      // Check context details separately
      expect(actual[0].refContext).toBeInstanceOf(Map);
      expect(actual[0].refContext.size).toBe(1);
      expect(Array.from(actual[0].refContext.values())).toEqual([
        expect.objectContaining({ id: 'A' }),
      ]);
    }

    // Test Case 2: Non-matching input (second object's id is wrong)
    {
      const input: Array<TestObject> = [{ id: 'A' }, { id: 'A_wrong' }, { id: 'B' }];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<TestObject> = [];
      expect(actual).toEqual(expected);
    }

    // Test Case 3: Non-matching input (first item doesn't capture)
    {
      const input: Array<TestObject> = [{ id: '' }, { id: '_suffix' }]; // First item has empty id
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<TestObject> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should correctly apply a simple predicate via refPredicate', () => {
    // Using withRefs, but only testing refPredicate with a standard predicate
    const pattern = withRefs<number>((helpers) => {
      const { refPredicate } = helpers;

      // The pattern simply uses imported equals(5)
      return refPredicate(equals(5));
    });

    // Test Case 1: Matching input
    {
      const input = [5, 10]; // Should match the first item
      const actual = pattern.match(initialMatchState(input));
      expect(actual[0].refContext.size).toBe(0);
      expect(Array.from(actual[0].refContext.values())).toEqual([]);
    }

    // Test Case 2: Non-matching input
    {
      const input = [6, 10]; // Should not match
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should handle multiple independent references', () => {
    // Test with mixed types (number and string)
    const pattern = withRefs<number | string>((helpers) => {
      const { createRef, refPredicate, captureRef, ref } = helpers;

      // Create two distinct references
      const numRef = createRef<number>();
      const strRef = createRef<string>();

      return sequence(
        // Step 1: Capture the first item (must be a number) into numRef
        refPredicate(captureRef(numRef, (val): val is number => typeof val === 'number')),
        // Step 2: Capture the second item (must be a string) into strRef - Cast result
        refPredicate(captureRef(strRef, (val): val is string => typeof val === 'string')),
        // Step 3: Match the third item against the captured number
        refPredicate(ref(numRef)),
        // Step 4: Match the fourth item against the captured string - Cast result
        refPredicate(ref(strRef)),
      );
    });

    // Test Case 1: Matching input
    {
      const input = [100, 'alpha', 100, 'alpha', 999];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number | string> = [
        { input, nextIndex: 4, refContext: expect.any(Map) },
      ];
      expect(actual).toEqual(expected);
      // Check context details separately
      const actualContext = actual[0].refContext;
      expect(actualContext).toBeInstanceOf(Map);
      expect(actualContext.size).toBe(2); // Should contain captures from both number and string
      expect(Array.from(actualContext.values())).toEqual(expect.arrayContaining([100, 'alpha']));
    }

    // Test Case 2: Non-matching (third item mismatch)
    {
      const input = [100, 'alpha', 999, 'alpha'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number | string> = [];
      expect(actual).toEqual(expected);
    }

    // Test Case 3: Non-matching (fourth item mismatch)
    {
      const input = [100, 'alpha', 100, 'beta'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number | string> = [];
      expect(actual).toEqual(expected);
    }

    // Test Case 4: Non-matching (first item wrong type for capture)
    {
      const input = ['not a number', 'alpha', 100, 'alpha'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number | string> = [];
      expect(actual).toEqual(expected);
    }

    // Test Case 5: Non-matching (second item wrong type for capture)
    {
      const input = [100, 200, 100, 'alpha'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<number | string> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should throw ReferenceError if ref() is used before captureRef()', () => {
    const pattern = withRefs<number>((helpers) => {
      const { createRef, refPredicate, ref } = helpers;
      const valueRef = createRef<number>();
      return refPredicate(ref(valueRef));
    });

    const input = [42];
    // Expect the match call itself to throw
    expect(() => pattern.match(initialMatchState(input))).toThrow(ReferenceError);
  });

  it('should throw ReferenceError if retrieveRef() is used before captureRef()', () => {
    const pattern = withRefs<number>((helpers) => {
      const { createRef, refPredicate, retrieveRef } = helpers;
      const valueRef = createRef<number>();
      return refPredicate(
        lazy((value: number) => {
          const captured = retrieveRef(valueRef); // This should throw
          return value === captured;
        }),
      );
    });

    const input = [42];
    // Expect the match call itself to throw
    expect(() => pattern.match(initialMatchState(input))).toThrow(ReferenceError);
  });

  it('should maintain isolated scopes when withRefs patterns are composed in sequence', () => {
    // Pattern A: Captures 10, then matches 10
    const patternA = withRefs<number>((helpers) => {
      const { createRef, refPredicate, captureRef, ref } = helpers;
      const valueRef = createRef<number>(); // Scope A
      return sequence(refPredicate(captureRef(valueRef, equals(10))), refPredicate(ref(valueRef)));
    });

    // Pattern B: Captures 20, then matches 20
    const patternB = withRefs<number>((helpers) => {
      const { createRef, refPredicate, captureRef, ref } = helpers;
      const valueRef = createRef<number>(); // Scope B (independent of Scope A)
      return sequence(refPredicate(captureRef(valueRef, equals(20))), refPredicate(ref(valueRef)));
    });

    // Combined Pattern: Run A then B
    const combinedPattern = sequence(patternA, patternB);

    // Test 1: Combined pattern matches expected sequence
    {
      const input = [10, 10, 20, 20, 30]; // A matches [10, 10], B matches [20, 20]
      const expected: PatternMatchResults<number> = [
        { input, nextIndex: 4, refContext: expect.any(Map) },
      ];
      expect(combinedPattern.match(initialMatchState(input))).toEqual(expected);
      // Check context details separately
      const actualContext = combinedPattern.match(initialMatchState(input))[0].refContext;
      expect(actualContext).toBeInstanceOf(Map);
      expect(actualContext.size).toBe(2); // Should contain captures from both A and B
      expect(Array.from(actualContext.values())).toEqual(expect.arrayContaining([10, 20]));
    }

    // Test 2: Combined pattern fails if A's second part fails
    {
      const input = [10, 99, 20, 20, 30]; // Fails ref(valueRef) in A
      const expected: PatternMatchResults<number> = [];
      expect(combinedPattern.match(initialMatchState(input))).toEqual(expected);
    }

    // Test 3: Combined pattern fails if B's second part fails
    {
      const input = [10, 10, 20, 99, 30]; // Fails ref(valueRef) in B
      const expected: PatternMatchResults<number> = [];
      expect(combinedPattern.match(initialMatchState(input))).toEqual(expected);
    }

    // Test 4: Combined pattern fails if A's capture fails
    {
      const input = [99, 10, 20, 20, 30]; // Fails captureRef in A
      const expected: PatternMatchResults<number> = [];
      expect(combinedPattern.match(initialMatchState(input))).toEqual(expected);
    }

    // Test 5: Combined pattern fails if B's capture fails
    {
      const input = [10, 10, 99, 20, 30]; // Fails captureRef in B
      const expected: PatternMatchResults<number> = [];
      expect(combinedPattern.match(initialMatchState(input))).toEqual(expected);
    }
  });

  it('should handle complex predicates combining refs and combinators', () => {
    type Message = { type: string; value: number; correlationId?: string };

    const pattern = withRefs<Message>((helpers) => {
      const { createRef, refPredicate, captureRef, retrieveRef } = helpers;
      const startValueRef = createRef<number>();

      return sequence(
        // Step 1: Match 'start' message and capture its value
        refPredicate(
          and(
            hasField('type', equals('start')),
            hasField('value', captureRef(startValueRef, any())),
          ),
        ),
        // Step 2: Match 'end' message where value = startValue + 1
        refPredicate(
          and(
            hasField('type', equals('end')),
            hasField(
              'value',
              lazy((v: number) => v === retrieveRef(startValueRef) + 1),
            ),
          ),
        ),
      );
    });

    // Test Case 1: Matching sequence
    {
      const input: Array<Message> = [
        { type: 'start', value: 5 },
        { type: 'end', value: 6 },
        { type: 'other', value: 99 },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 2, refContext: expect.any(Map) },
      ];
      expect(actual).toEqual(expected);
      // Check context details separately
      expect(actual[0].refContext).toBeInstanceOf(Map);
      expect(actual[0].refContext.size).toBe(1);
      expect(Array.from(actual[0].refContext.values())).toEqual([5]);
    }

    // Test Case 2: Non-matching (end value incorrect)
    {
      const input: Array<Message> = [
        { type: 'start', value: 5 },
        { type: 'end', value: 7 }, // Should be 6
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    // Test Case 3: Non-matching (start type incorrect)
    {
      const input: Array<Message> = [
        { type: 'begin', value: 5 }, // Should be 'start'
        { type: 'end', value: 6 },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should return no matches for an empty input array', () => {
    // Define a simple pattern; its internal logic won't be reached
    const pattern = withRefs<number>((helpers) => {
      const { createRef, refPredicate, captureRef } = helpers;
      const valueRef = createRef<number>();
      return refPredicate(captureRef(valueRef, equals(1)));
    });

    const input: Array<number> = [];
    const actual = pattern.match(initialMatchState(input));

    // Expectation: No match results for empty input
    const expected: PatternMatchResults<number> = [];
    expect(actual).toEqual(expected);
  });
});
