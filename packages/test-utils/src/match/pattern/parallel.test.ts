import { describe, it, expect } from 'vitest';
import { parallel } from './parallel';
import { predicate } from './predicate';
import { PatternMatchResults } from '../types';
import { matchPattern } from '../match';
import { sequence } from './sequence';

describe(parallel, () => {
  it('should match items regardless of order', () => {
    const isA = (s: string) => s === 'A';
    const isB = (s: string) => s === 'B';
    const isC = (s: string) => s === 'C';

    const hasAllLetters = parallel<string>(predicate(isA), predicate(isB), predicate(isC));

    // Should match different orderings
    {
      const input: string[] = ['A', 'B', 'C'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [{ input, nextIndex: 3, captures: [] }];
      expect(actual).toEqual(expected);
    }
    {
      const input: string[] = ['A', 'C', 'B'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [{ input, nextIndex: 3, captures: [] }];
      expect(actual).toEqual(expected);
    }
    {
      const input: string[] = ['B', 'A', 'C'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [{ input, nextIndex: 3, captures: [] }];
      expect(actual).toEqual(expected);
    }
    {
      const input: string[] = ['B', 'C', 'A'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [{ input, nextIndex: 3, captures: [] }];
      expect(actual).toEqual(expected);
    }
    {
      const input: string[] = ['C', 'A', 'B'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [{ input, nextIndex: 3, captures: [] }];
      expect(actual).toEqual(expected);
    }
    // Should not match if missing items or with extra items
    {
      const input: string[] = ['A', 'B'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected);
    }
    {
      const input: string[] = ['A', 'C'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected);
    }
    {
      const input: string[] = ['A', 'B', 'C', 'D'];
      const actual = matchPattern(input, hasAllLetters);
      const expected: PatternMatchResults<string> = [{ input, nextIndex: 3, captures: [] }];
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
    const parallelPattern = parallel<Message>(
      predicate(isHighPriority),
      predicate(hasErrorType),
      predicate(hasInfoType),
    );

    // Should match different orderings
    {
      const input: Message[] = [
        { type: 'WARNING', priority: 'high' },
        { type: 'ERROR', priority: 'medium' },
        { type: 'INFO', priority: 'low' },
      ];
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 3, captures: [] }];
      const actual = matchPattern(input, parallelPattern);
      expect(actual).toEqual(expected);
    }
    {
      const input: Message[] = [
        { type: 'ERROR', priority: 'medium' },
        { type: 'INFO', priority: 'low' },
        { type: 'WARNING', priority: 'high' },
      ];
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 3, captures: [] }];
      const actual = matchPattern(input, parallelPattern);
      expect(actual).toEqual(expected);
    }
    {
      const input: Message[] = [
        { type: 'INFO', priority: 'low' },
        { type: 'WARNING', priority: 'high' },
        { type: 'ERROR', priority: 'medium' },
      ];
      const expected: PatternMatchResults<Message> = [{ input, nextIndex: 3, captures: [] }];
      const actual = matchPattern(input, parallelPattern);
      expect(actual).toEqual(expected);
    }

    // Should not match if requirements not met
    {
      const input = [
        { type: 'WARNING', priority: 'medium' }, // Not high priority
        { type: 'ERROR', priority: 'medium' },
        { type: 'INFO', priority: 'low' },
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = matchPattern(input, parallelPattern);
      expect(actual).toEqual(expected);
    }

    {
      const input: Message[] = [
        { type: 'WARNING', priority: 'high' },
        { type: 'WARNING', priority: 'medium' }, // Not ERROR
        { type: 'INFO', priority: 'low' },
      ];
      const expected: PatternMatchResults<Message> = [];
      const actual = matchPattern(input, parallelPattern);
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
    const concurrentActions = parallel<HandlerAction>(
      predicate(isProgressMessage),
      predicate(isUpdateMessage),
    );

    // This should match - any order is fine
    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'PROGRESS' } },
        { type: 'Send', message: { type: 'UPDATE' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 2, captures: [] }];
      const actual = matchPattern(input, concurrentActions);
      expect(actual).toEqual(expected);
    }

    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'UPDATE' } },
        { type: 'Send', message: { type: 'PROGRESS' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 2, captures: [] }];
      const actual = matchPattern(input, concurrentActions);
      expect(actual).toEqual(expected);
    }

    // This should not match - missing required message
    {
      const input: HandlerAction[] = [{ type: 'Send', message: { type: 'PROGRESS' } }];
      const expected: PatternMatchResults<HandlerAction> = [];
      const actual = matchPattern(input, concurrentActions);
      expect(actual).toEqual(expected);
    }

    // This should match - next match begins with extra message
    {
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'PROGRESS' } },
        { type: 'Send', message: { type: 'UPDATE' } },
        { type: 'Send', message: { type: 'EXTRA' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 2, captures: [] }];
      const actual = matchPattern(input, concurrentActions);
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
      const input: HandlerAction[] = [
        { type: 'Send', message: { type: 'PROGRESS' } },
        { type: 'Send', message: { type: 'UPDATE' } },
        { type: 'Send', message: { type: 'END' } },
      ];
      const expected: PatternMatchResults<HandlerAction> = [{ input, nextIndex: 3, captures: [] }];
      const actual = matchPattern(input, pattern);
      expect(actual).toEqual(expected);
    }
  });
});
