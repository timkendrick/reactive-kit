import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import type { PatternMatchResults } from '../types';

import { parallel } from './parallel';
import { predicate } from './predicate';
import { sequence } from './sequence';
import { zeroOrMore } from './zeroOrMore';

describe(parallel, () => {
  it('should match items regardless of order', () => {
    const isA = (s: string) => s === 'A';
    const isB = (s: string) => s === 'B';
    const isC = (s: string) => s === 'C';

    const pattern = parallel<string>(predicate(isA), predicate(isB), predicate(isC));

    // Should match different orderings
    {
      const input: Array<string> = ['A', 'B', 'C'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['A', 'C', 'B'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['B', 'A', 'C'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['B', 'C', 'A'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['C', 'A', 'B'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }
    // Should not match if missing items or with extra items
    {
      const input: Array<string> = ['A', 'B'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['A', 'C'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['A', 'B', 'C', 'D'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }
  });

  it('should work with complex patterns', () => {
    // Define types for our test
    type Message = {
      type: string;
      priority: 'high' | 'medium' | 'low';
    };

    // Predicates for our pattern
    const isHighPriority = (msg: Message) => msg.priority === 'high';
    const hasErrorType = (msg: Message) => msg.type === 'ERROR';
    const hasInfoType = (msg: Message) => msg.type === 'INFO';

    // Pattern that matches any ordering of:
    // - a high priority message
    // - an error message
    // - an info message
    const pattern = parallel<Message>(
      predicate(isHighPriority),
      predicate(hasErrorType),
      predicate(hasInfoType),
    );

    // Should match different orderings
    {
      const input: Array<Message> = [
        { type: 'WARNING', priority: 'high' },
        { type: 'ERROR', priority: 'medium' },
        { type: 'INFO', priority: 'low' },
      ];
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<Message> = [
        { type: 'ERROR', priority: 'medium' },
        { type: 'INFO', priority: 'low' },
        { type: 'WARNING', priority: 'high' },
      ];
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<Message> = [
        { type: 'INFO', priority: 'low' },
        { type: 'WARNING', priority: 'high' },
        { type: 'ERROR', priority: 'medium' },
      ];
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    // Should not match if requirements not met
    {
      const input: Array<Message> = [
        { type: 'WARNING', priority: 'medium' }, // Not high priority
        { type: 'ERROR', priority: 'medium' },
        { type: 'INFO', priority: 'low' },
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    {
      const input: Array<Message> = [
        { type: 'WARNING', priority: 'high' },
        { type: 'WARNING', priority: 'medium' }, // Not ERROR
        { type: 'INFO', priority: 'low' },
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
  });

  it('matches concurrent actions', () => {
    type HandlerAction = {
      type: string;
      message?: { type: string };
    };

    const hasActionType = (type: string) => (action: HandlerAction) => action.type === type;
    const hasMessageType = (type: string) => (action: HandlerAction) =>
      action.message !== undefined && action.message.type === type;

    const isProgressMessage = (action: HandlerAction) =>
      hasActionType('Send')(action) && hasMessageType('PROGRESS')(action);

    const isUpdateMessage = (action: HandlerAction) =>
      hasActionType('Send')(action) && hasMessageType('UPDATE')(action);

    // Pattern for concurrent actions with unknown order
    const pattern = parallel<HandlerAction>(
      predicate(isProgressMessage),
      predicate(isUpdateMessage),
    );

    // This should match - any order is fine
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'PROGRESS' } },
        { type: 'Send', message: { type: 'UPDATE' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 2, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'UPDATE' } },
        { type: 'Send', message: { type: 'PROGRESS' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 2, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    // This should not match - missing required message
    {
      const input: Array<HandlerAction> = [{ type: 'Send', message: { type: 'PROGRESS' } }];
      const expected: PatternMatchResults<HandlerAction> = [];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    // This should match - next match begins with extra message
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'PROGRESS' } },
        { type: 'Send', message: { type: 'UPDATE' } },
        { type: 'Send', message: { type: 'EXTRA' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 2, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
  });

  it('should allow usage within a larger pattern', () => {
    type HandlerAction = {
      type: string;
      message?: { type: string };
    };

    const hasActionType = (type: string) => (action: HandlerAction) => action.type === type;
    const hasMessageType = (type: string) => (action: HandlerAction) =>
      action.message !== undefined && action.message.type === type;

    const isProgressMessage = (action: HandlerAction) =>
      hasActionType('Send')(action) && hasMessageType('PROGRESS')(action);

    const isUpdateMessage = (action: HandlerAction) =>
      hasActionType('Send')(action) && hasMessageType('UPDATE')(action);

    const isEndMessage = (action: HandlerAction) =>
      hasActionType('Send')(action) && hasMessageType('END')(action);

    const pattern = sequence<HandlerAction>(
      parallel<HandlerAction>(predicate(isProgressMessage), predicate(isUpdateMessage)),
      predicate(isEndMessage),
    );
    {
      const input: Array<HandlerAction> = [
        { type: 'Send', message: { type: 'PROGRESS' } },
        { type: 'Send', message: { type: 'UPDATE' } },
        { type: 'Send', message: { type: 'END' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
  });

  it('should handle variable-length sub-patterns', () => {
    const isA = (s: string) => s === 'A';
    const isB = (s: string) => s === 'B';

    // Pattern: Match one 'A' and zero or more consecutive 'B's, in any order relative to each other.
    const pattern = parallel<string>(predicate(isA), zeroOrMore(predicate(isB)));

    {
      const input = ['A', 'B', 'B'];
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 1, refContext: new Map() }, // 'A' matched, zero 'B's
        { input, nextIndex: 2, refContext: new Map() }, // 'A' matched, one 'B'
        { input, nextIndex: 3, refContext: new Map() }, // 'A' matched, two 'B's
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
    {
      const input = ['B', 'A', 'B'];
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 2, refContext: new Map() }, // 'B', 'A' consumed
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
    {
      const input = ['B', 'B', 'A'];
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() }, // 'B', 'B', 'A' consumed
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    {
      const input = ['A'];
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 1, refContext: new Map() }, // 'A' consumed
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    {
      const input = ['B', 'B'];
      const expected: PatternMatchResults<string> = []; // Missing 'A'
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }

    {
      const input = ['A', 'C', 'B'];
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 1, refContext: new Map() }, // 'A' consumed, no 'B's
      ];
      const actual = pattern.match(initialMatchState(input));
      expect(actual).toEqual(expected);
    }
  });
});
