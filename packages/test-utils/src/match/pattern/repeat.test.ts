import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import { and } from '../predicate/and';
import type { PatternMatchResults, Predicate } from '../types';

import { predicate } from './predicate';
import { repeat } from './repeat';
import { sequence } from './sequence';

describe(repeat, () => {
  it('should match exactly n occurrences within a sequence (future implementation)', () => {
    // Define message types for testing
    type Message = {
      type: string;
      progress?: number;
    };

    // Define predicates
    const hasType = (type: string) => (msg: Message) => msg.type === type;
    const hasProgress = (msg: Message) => msg.progress !== undefined;
    const isProgressMessage: Predicate<Message> = and(hasType('PROGRESS'), hasProgress);

    // Create a sequence that matches:
    // 1. A START message
    // 2. Exactly 3 PROGRESS messages
    // 3. A COMPLETE message
    const pattern = sequence<Message>(
      predicate(hasType('START')),
      repeat(3, predicate(isProgressMessage)),
      predicate(hasType('COMPLETE')),
    );

    // Should match when there are exactly 3 PROGRESS messages
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.25 },
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'PROGRESS', progress: 0.75 },
        { type: 'COMPLETE' },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 5, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // Should not match when there are fewer than 3 PROGRESS messages
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'PROGRESS', progress: 1.0 },
        { type: 'COMPLETE' },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match when there are more than 3 PROGRESS messages
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.25 },
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'PROGRESS', progress: 0.75 },
        { type: 'PROGRESS', progress: 1.0 },
        { type: 'COMPLETE' },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match if required messages are missing
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.25 },
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'PROGRESS', progress: 0.75 },
        // Missing COMPLETE
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    {
      const input: Array<Message> = [
        // Missing START
        { type: 'PROGRESS', progress: 0.25 },
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'PROGRESS', progress: 0.75 },
        { type: 'COMPLETE' },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should handle zero count within sequences (future implementation)', () => {
    // Define message types for testing
    type Message = {
      type: string;
      progress?: number;
    };

    // Define predicates
    const hasType = (type: string) => (msg: Message) => msg.type === type;

    // Create a sequence that matches:
    // 1. A START message
    // 2. Zero PROGRESS messages (using repeat with count 0)
    // 3. A COMPLETE message
    const pattern = sequence<Message>(
      predicate(hasType('START')),
      repeat(0, predicate(hasType('PROGRESS'))),
      predicate(hasType('COMPLETE')),
    );

    // Should match when there are no PROGRESS messages
    {
      const input: Array<Message> = [{ type: 'START' }, { type: 'COMPLETE' }];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 2, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // Should not match when there are any PROGRESS messages
    {
      const input: Array<Message> = [{ type: 'START' }, { type: 'PROGRESS' }, { type: 'COMPLETE' }];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('should work with handler actions', () => {
    type HandlerAction = {
      type: 'Send' | 'Spawn' | 'Kill';
      message?: {
        type: string;
        progress?: number;
      };
    };

    const hasActionType = (type: string) => (action: HandlerAction) => action.type === type;

    const hasMessageType = (type: string) => (action: HandlerAction) =>
      action.message?.type === type;

    const isProgressMessage = and(
      hasActionType('Send'),
      hasMessageType('PROGRESS'),
      (action: HandlerAction) => action.message?.progress !== undefined,
    );

    // Create a sequence pattern that matches:
    // 1. A START message
    // 2. Exactly 3 PROGRESS messages
    // 3. A COMPLETE message
    const pattern = sequence<HandlerAction>(
      predicate(and(hasActionType('Send'), hasMessageType('START'))),
      repeat(3, predicate(isProgressMessage)),
      predicate(and(hasActionType('Send'), hasMessageType('COMPLETE'))),
    );

    // Should match with exactly 3 progress messages
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.25 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.5 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.75 } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 5, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // Should not match with fewer progress messages
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.5 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.75 } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match with more progress messages
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.25 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.5 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.75 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 1.0 } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match with interrupted sequence
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.25 } },
        { type: 'Send', message: { type: 'ERROR' } }, // Interruption
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.5 } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.75 } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [];
      expect(actual).toEqual(expected);
    }
  });
});
