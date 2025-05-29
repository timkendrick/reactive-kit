import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import { and } from '../predicate/and';
import type { PatternMatchResults } from '../types';

import { oneOrMore } from './oneOrMore';
import { predicate } from './predicate';
import { sequence } from './sequence';

describe(oneOrMore, () => {
  it('should match sequences with one or more matching items', () => {
    // Define message types for testing
    type Message = {
      type: string;
      progress?: number;
    };

    // Define predicates
    const hasType = (type: string) => (msg: Message) => msg.type === type;
    const hasProgress = (msg: Message) => msg.progress !== undefined;
    const isProgressMessage = and(hasType('PROGRESS'), hasProgress);

    // Create a sequence that matches:
    // 1. A START message
    // 2. One or more PROGRESS messages
    // 3. A COMPLETE message
    const pattern = sequence<Message>(
      predicate(hasType('START')),
      oneOrMore(predicate(isProgressMessage)),
      predicate(hasType('COMPLETE')),
    );

    // Should match when there is at least one PROGRESS message
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'COMPLETE' },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // Should match when there are multiple PROGRESS messages
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

    // Should not match when there are no PROGRESS messages
    {
      const input: Array<Message> = [{ type: 'START' }, { type: 'COMPLETE' }];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match if required messages are missing
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.5 },
        // Missing COMPLETE
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    {
      const input: Array<Message> = [
        // Missing START
        { type: 'PROGRESS', progress: 0.5 },
        { type: 'COMPLETE' },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match if there are unexpected messages
    {
      const input: Array<Message> = [
        { type: 'START' },
        { type: 'PROGRESS', progress: 0.25 },
        { type: 'ERROR' }, // Unexpected message
        { type: 'PROGRESS', progress: 0.75 },
        { type: 'COMPLETE' },
      ];
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
    // 2. One or more PROGRESS messages
    // 3. A COMPLETE message
    const pattern = sequence<HandlerAction>(
      predicate(and(hasActionType('Send'), hasMessageType('START'))),
      oneOrMore(predicate(isProgressMessage)),
      predicate(and(hasActionType('Send'), hasMessageType('COMPLETE'))),
    );

    // Should match with one progress message
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.5 } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // Should match with multiple progress messages
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

    // Should not match with no progress messages
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [];
      expect(actual).toEqual(expected);
    }

    // Should not match with interrupted progress sequence
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'START' } },
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.25 } },
        { type: 'Send', message: { type: 'ERROR' } }, // Interruption
        { type: 'Send', message: { type: 'PROGRESS', progress: 0.75 } },
        { type: 'Send', message: { type: 'COMPLETE' } },
      ];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [];
      expect(actual).toEqual(expected);
    }
  });
});
