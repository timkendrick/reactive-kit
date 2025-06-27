import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { createSpawnedActorValueResolver } from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_KILL } from '../vm/operations/actorKill';

import { kill } from './kill';
import { send } from './send';
import { sequence } from './sequence';

describe(kill, () => {
  describe(compile, () => {
    it('should compile kill action with target handle', () => {
      const target = createSpawnedActorValueResolver<never>(0);
      const program = kill(target);
      const instructions = compile(program);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_ACTOR_KILL,
          target,
        },
      ]);
    });
  });

  describe('evaluate', () => {
    it('should terminate the actor when killing self, preventing subsequent actions', async () => {
      type TestMessage = string;

      const actorDefinition = act<TestMessage>((self, { outbox }) =>
        sequence(() => [
          send(outbox, 'MESSAGE_BEFORE_KILL'),
          kill(self),
          send(outbox, 'MESSAGE_AFTER_KILL'),
        ]),
      );

      const scheduler = new AsyncScheduler<TestMessage>((_context) => actorDefinition);

      const result1 = await scheduler.next();
      expect(result1).toEqual({ done: false, value: 'MESSAGE_BEFORE_KILL' });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });
  });
});
