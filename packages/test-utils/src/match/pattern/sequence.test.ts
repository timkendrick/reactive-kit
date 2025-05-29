import { describe, expect, it } from 'vitest';

import { initialMatchState } from '../match';
import { any } from '../predicate/any';
import type { PatternMatchResults } from '../types';

import { oneOrMore } from './oneOrMore';
import { predicate } from './predicate';
import { sequence } from './sequence';
import { zeroOrMore } from './zeroOrMore';

describe('sequence', () => {
  it('should match an exact sequence of items', () => {
    const isDigit = (s: string) => /^\d$/.test(s);
    const isLower = (s: string) => /^[a-z]$/.test(s);
    const isUpper = (s: string) => /^[A-Z]$/.test(s);

    const pattern = sequence<string>(predicate(isDigit), predicate(isLower), predicate(isUpper));

    // This should pass when sequence is implemented - digit, lowercase, uppercase
    {
      const input: Array<string> = ['1', 'a', 'Z'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [
        { input, nextIndex: 3, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // These should fail - wrong order or wrong items
    {
      const input: Array<string> = ['a', '1', 'Z'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['1', 'A', 'z'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected);
    }
    {
      const input: Array<string> = ['1', 'a'];
      const actual = pattern.match(initialMatchState(input));
      const expected: PatternMatchResults<string> = [];
      expect(actual).toEqual(expected); // Too short
    }
  });

  it('should support nested sequences on flat arrays', () => {
    type Message = {
      type: string;
    };

    const hasType = (type: string) => (msg: Message) => msg.type === type;

    // A sequence that matches a pattern where:
    // 1. First we see an INIT message
    // 2. Then we see a subsequence of START, PROCESS, END
    // 3. Finally we see a COMPLETE message
    const outerSequence = sequence<Message>(
      predicate(hasType('INIT')),
      sequence<Message>(
        predicate(hasType('START')),
        predicate(hasType('PROCESS')),
        predicate(hasType('END')),
      ),
      predicate(hasType('COMPLETE')),
    );

    // The nested sequence operates on the same flat array - it doesn't expect nested arrays
    {
      const input: Array<Message> = [
        { type: 'INIT' }, // Matches first part of outer sequence
        { type: 'START' }, // Start of nested sequence
        { type: 'PROCESS' }, // Middle of nested sequence
        { type: 'END' }, // End of nested sequence
        { type: 'COMPLETE' }, // Matches final part of outer sequence
      ];
      const actual = outerSequence.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [
        { input, nextIndex: 5, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // These should fail - wrong order, missing elements, etc.
    {
      const input: Array<Message> = [
        { type: 'INIT' },
        { type: 'PROCESS' }, // Wrong order within nested sequence
        { type: 'START' },
        { type: 'END' },
        { type: 'COMPLETE' },
      ];
      const actual = outerSequence.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    {
      const input: Array<Message> = [
        { type: 'INIT' },
        { type: 'START' },
        { type: 'PROCESS' },
        // Missing 'END' and 'COMPLETE'
      ];
      const actual = outerSequence.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }

    {
      const input: Array<Message> = [
        { type: 'INIT' },
        { type: 'START' },
        { type: 'ERROR' }, // Unexpected message in the middle
        { type: 'PROCESS' },
        { type: 'END' },
        { type: 'COMPLETE' },
      ];
      const actual = outerSequence.match(initialMatchState(input));
      const expected: PatternMatchResults<Message> = [];
      expect(actual).toEqual(expected);
    }
  });

  it('matches complex nested sequences', () => {
    type MessageType = string;
    enum HandlerActionType {
      Send = 'Send',
      Spawn = 'Spawn',
      Kill = 'Kill',
    }

    type Message = {
      type: MessageType;
    };

    type HandlerAction = {
      type: HandlerActionType;
      target?: unknown;
      message?: Message;
    };

    const hasActionType = (type: HandlerActionType) => (action: HandlerAction) =>
      action.type === type;

    const hasMessageType = (type: MessageType) => (action: HandlerAction) =>
      action.message?.type === type;

    const and =
      <T>(...predicates: Array<(value: T) => boolean>) =>
      (value: T) =>
        predicates.every((predicate) => predicate(value));

    const MESSAGE_START = 'START';
    const MESSAGE_PROGRESS = 'PROGRESS';
    const MESSAGE_UPDATE = 'UPDATE';
    const MESSAGE_TICK = 'TICK';
    const MESSAGE_END = 'END';

    // Create a complex sequence pattern
    const complexSequence = sequence<HandlerAction>(
      // Exact message
      predicate(
        (action: HandlerAction) =>
          action.type === HandlerActionType.Send && action.message?.type === MESSAGE_START,
      ),

      // Zero or more of any messages
      zeroOrMore(predicate(any())),

      // One or more PROGRESS messages
      oneOrMore(
        predicate(
          (action: HandlerAction) =>
            action.type === HandlerActionType.Send && action.message?.type === MESSAGE_PROGRESS,
        ),
      ),

      // Nested sequence of TICK messages
      sequence<HandlerAction>(
        predicate(and(hasActionType(HandlerActionType.Send), hasMessageType(MESSAGE_TICK))),
        predicate(and(hasActionType(HandlerActionType.Send), hasMessageType(MESSAGE_TICK))),
        predicate(and(hasActionType(HandlerActionType.Send), hasMessageType(MESSAGE_TICK))),
      ),

      // Final END message
      predicate(and(hasActionType(HandlerActionType.Send), hasMessageType(MESSAGE_END))),
    );

    {
      const input: Array<HandlerAction> = [
        { type: HandlerActionType.Send, message: { type: MESSAGE_START } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_PROGRESS } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_TICK } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_TICK } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_TICK } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_END } },
      ];
      const actual = complexSequence.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [
        { input, nextIndex: 6, refContext: new Map() },
      ];
      expect(actual).toEqual(expected);
    }

    // Should fail if tick sequence is interrupted
    {
      const input: Array<HandlerAction> = [
        { type: HandlerActionType.Send, message: { type: MESSAGE_START } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_PROGRESS } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_TICK } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_UPDATE } }, // Interruption
        { type: HandlerActionType.Send, message: { type: MESSAGE_TICK } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_TICK } },
        { type: HandlerActionType.Send, message: { type: MESSAGE_END } },
      ];
      const actual = complexSequence.match(initialMatchState(input));
      const expected: PatternMatchResults<HandlerAction> = [];
      expect(actual).toEqual(expected);
    }
  });
});
