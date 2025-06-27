import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { compile } from '../vm/compile';
import { OP_TYPE_NOOP } from '../vm/operations/noop';

import { noop } from './noop';
import { send } from './send';
import { sequence } from './sequence';

describe(noop, () => {
  describe(compile, () => {
    it('should compile noop action', () => {
      const command = noop();
      const instructions = compile(command);

      expect(instructions).toEqual([{ type: OP_TYPE_NOOP }]);
    });
  });

  describe('evaluate', () => {
    it('should perform no operation and allow subsequent actions', async () => {
      type TestMessage = string;

      const actorDef = act<TestMessage>((_self, { outbox }) =>
        sequence(() => [send(outbox, 'BEFORE_NOOP'), noop(), send(outbox, 'AFTER_NOOP')]),
      );

      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actorDef);

      const result1 = await scheduler.next();
      expect(result1).toEqual({ done: false, value: 'BEFORE_NOOP' });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: false, value: 'AFTER_NOOP' });

      const result3 = await scheduler.next();
      expect(result3).toEqual({ done: true, value: undefined });
    });
  });
});
