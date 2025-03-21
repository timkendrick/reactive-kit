import { describe, it, expect } from 'vitest';
import { zeroOrMore } from './zeroOrMore';
import { sequence } from './sequence';
import { and } from '../predicate/and';
import { predicate } from './predicate';
import { matchPattern } from '../match';
import { PatternMatchResults } from '../types';

describe('zeroOrMore', () => {
  it('should match when there are zero or more matching items', () => {
    // Define message types for testing
    type Message = {
      type: string;
      payload?: unknown;
    };

    // Define predicates
    const hasType = (type: string) => (msg: Message) => msg.type === type;
    const hasPayload = (msg: Message) => msg.payload !== undefined;
    const isUpdateMessage = and(hasType('UPDATE'), hasPayload);

    // Create a sequence that matches:
    // 1. A START message
    // 2. Zero or more UPDATE messages
    // 3. An END message
    const pattern = sequence<Message>(
      predicate(hasType('START')),
      zeroOrMore(predicate(isUpdateMessage)),
      predicate(hasType('END')),
    );

    // Should match when there are no UPDATE messages
    {
      const input: Message[] = [{ type: 'START' }, { type: 'END' }];
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 2, captures: [] }];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    // Should match when there are some UPDATE messages
    {
      const input: Message[] = [
        { type: 'START' },
        { type: 'UPDATE', payload: 1 },
        { type: 'UPDATE', payload: 2 },
        { type: 'END' },
      ];
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 4, captures: [] }];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    // Should not match if required messages are missing
    {
      const input: Message[] = [
        { type: 'START' },
        { type: 'UPDATE', payload: 1 },
        // Missing END
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    {
      const input: Message[] = [
        // Missing START
        { type: 'UPDATE', payload: 1 },
        { type: 'END' },
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    // Should not match if there are unexpected messages
    {
      const input: Message[] = [
        { type: 'START' },
        { type: 'UPDATE', payload: 1 },
        { type: 'ERROR' }, // Unexpected message
        { type: 'UPDATE', payload: 2 },
        { type: 'END' },
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }
  });

  it('should work with debug messages', () => {
    type HandlerAction = {
      type: 'Send' | 'Spawn' | 'Kill';
      message?: {
        type: string;
        level?: string;
      };
    };

    const hasActionType = (type: string) => (action: HandlerAction) => action.type === type;

    const hasMessageType = (type: string) => (action: HandlerAction) =>
      action.message?.type === type;

    const isDebugMessage = and(
      hasActionType('Send'),
      (action: HandlerAction) => action.message?.level === 'debug',
    );

    // Create a sequence pattern that matches:
    // 1. A START message
    // 2. Zero or more DEBUG messages
    // 3. A COMPLETE message
    const pattern = sequence<HandlerAction>(
      predicate(and(hasActionType('Send'), hasMessageType('START'))),
      zeroOrMore(predicate(isDebugMessage)),
      predicate(and(hasActionType('Send'), hasMessageType('COMPLETE'))),
    );

    // Should match with no debug messages
    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 2, captures: [] }];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    // Should match with some debug messages
    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'LOG', level: 'debug' } },
        { type: 'Send', message: { type: 'LOG', level: 'debug' } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 4, captures: [] }];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    // Should match with some debug messages
    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'LOG', level: 'debug' } },
        { type: 'Send', message: { type: 'LOG', level: 'debug' } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 4, captures: [] }];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }

    // Should not match with other messages mixed in
    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'LOG', level: 'debug' } },
        { type: 'Send', message: { type: 'ERROR' } }, // Unexpected message
        { type: 'Send', message: { type: 'LOG', level: 'debug' } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }
  });

  it('should match empty arrays and arrays without matching items', () => {
    const isEven = (n: number) => n % 2 === 0;
    const matcher = zeroOrMore<number>(predicate(isEven));

    // Should match when array has even numbers
    {
      const input: number[] = [2];
      // Expect both zero matches (nextIndex: 0) and one match (nextIndex: 1)
      const expected: PatternMatchResults<number> = [
        { input, nextIndex: 0, captures: [] },
        { input, nextIndex: 1, captures: [] },
      ];
      const actual = matchPattern(input, matcher);
      expect(actual).toEqual(expect.arrayContaining(expected));
      expect(actual.length).toBe(expected.length);
    }

    // Should match when array has multiple even numbers
    {
      const input: number[] = [2, 4, 6];
      // Expect states for 0, 1, 2, and 3 matches
      const expected: PatternMatchResults<number> = [
        { input, nextIndex: 0, captures: [] },
        { input, nextIndex: 1, captures: [] },
        { input, nextIndex: 2, captures: [] },
        { input, nextIndex: 3, captures: [] },
      ];
      const actual = matchPattern(input, matcher);
      expect(actual).toEqual(expect.arrayContaining(expected));
      expect(actual.length).toBe(expected.length);
    }

    // Should also match when array has no even numbers or is empty
    {
      const input: number[] = [1];
      // Expect only the zero-match state as it fails immediately
      const expected: PatternMatchResults<number> = [{ input, nextIndex: 0, captures: [] }];
      const actual = matchPattern(input, matcher);
      expect(actual).toEqual(expect.arrayContaining(expected)); // Use arrayContaining
      expect(actual.length).toBe(expected.length);
    }
    {
      const input: number[] = [1, 3, 5];
      // Expect only the zero-match state
      const expected: PatternMatchResults<number> = [{ input, nextIndex: 0, captures: [] }];
      const actual = matchPattern(input, matcher);
      expect(actual).toEqual(expect.arrayContaining(expected)); // Use arrayContaining
      expect(actual.length).toBe(expected.length);
    }

    // Should match when array is empty
    {
      const input: number[] = [];
      const expected: PatternMatchResults<number> = [{ input, nextIndex: 0, captures: [] }];
      const actual = matchPattern(input, matcher);
      expect(actual).toEqual(expected);
    }
  });

  it('should work with optional messages in testing scenarios', () => {
    type Message = {
      type: string;
      status?: string;
    };

    // Create a predicate for debug messages
    const isDebugMessage = (msg: Message) => msg.type === 'DEBUG';

    // Create a pattern that matches zero or more debug messages
    const hasDebugMessages = zeroOrMore<Message>(predicate(isDebugMessage));

    // Should match when there are debug messages
    {
      const input: Message[] = [{ type: 'DEBUG' }];
      // Expect both zero matches (nextIndex: 0) and one match (nextIndex: 1)
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 0, captures: [] },
        { input, nextIndex: 1, captures: [] },
      ];
      const actual = matchPattern(input, hasDebugMessages);
      expect(actual).toEqual(expect.arrayContaining(expected));
      expect(actual.length).toBe(expected.length);
    }

    {
      const input: Message[] = [{ type: 'DEBUG' }, { type: 'DEBUG' }];
      // Expect states for 0, 1, and 2 matches
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 0, captures: [] },
        { input, nextIndex: 1, captures: [] },
        { input, nextIndex: 2, captures: [] },
      ];
      const actual = matchPattern(input, hasDebugMessages);
      expect(actual).toEqual(expect.arrayContaining(expected));
      expect(actual.length).toBe(expected.length);
    }

    {
      const input: Message[] = [{ type: 'START' }, { type: 'DEBUG' }, { type: 'END' }];
      // matchPattern starts at 0. 'START' doesn't match isDebug, so only zero-match state.
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 0, captures: [] }];
      const actual = matchPattern(input, hasDebugMessages);
      expect(actual).toEqual(expect.arrayContaining(expected)); // Use arrayContaining
      expect(actual.length).toBe(expected.length);
    }

    // Should also match when there are no debug messages
    {
      const input: Message[] = [{ type: 'START' }, { type: 'PROGRESS' }, { type: 'END' }];
      // matchPattern starts at 0. 'START' doesn't match isDebug, so only zero-match state.
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 0, captures: [] }];
      const actual = matchPattern(input, hasDebugMessages);
      expect(actual).toEqual(expect.arrayContaining(expected)); // Use arrayContaining
      expect(actual.length).toBe(expected.length);
    }

    // Should match when array is empty
    {
      const input: Message[] = [];
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 0, captures: [] }];
      const actual = matchPattern(input, hasDebugMessages);
      expect(actual).toEqual(expected);
    }
  });
});
