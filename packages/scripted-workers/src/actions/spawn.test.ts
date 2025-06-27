import { describe, expect, it } from 'vitest';

import type { ActorHandle, SyncActorFactory } from '@reactive-kit/actor';
import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { readState } from '../state/readState';
import {
  createSpawnedActorValueResolver,
  type ActorCommand,
  type SpawnedActorResolver,
} from '../types';
import {
  OP_TYPE_ACTOR_KILL,
  OP_TYPE_ACTOR_SEND,
  OP_TYPE_ACTOR_SPAWN,
  OP_TYPE_BLOCK_BREAK,
  OP_TYPE_BLOCK_ENTER,
  type ActorKillOp,
  type ActorSendOp,
  type ActorSpawnOp,
  type BlockBreakOp,
  type BlockEnterOp,
} from '../vm';
import { compile } from '../vm/compile';

import { kill } from './kill';
import { send } from './send';
import { sequence } from './sequence';
import { spawn } from './spawn';
import { waitFor } from './waitFor';

describe(spawn, () => {
  type ChildMsg = string;
  type ParentMsg = string;

  describe('compile', () => {
    it('should compile spawn command to a VM_COMMAND_SPAWN instruction', () => {
      const childFactory = act<ChildMsg>((_self, { complete }) => complete());
      const self = {} as ActorHandle<ParentMsg>;

      const program = sequence(() => [
        spawn(
          childFactory,
          self,
          (outerHandle: SpawnedActorResolver<ChildMsg>): ActorCommand<ChildMsg> =>
            sequence(() => [
              send(outerHandle, 'OUTER'),
              spawn(
                childFactory,
                self,
                (innerHandle: SpawnedActorResolver<ChildMsg>): ActorCommand<ChildMsg> =>
                  sequence(() => [send(innerHandle, 'INNER'), kill(innerHandle)]),
              ),
              kill(outerHandle),
            ]),
        ),
        spawn(
          childFactory,
          self,
          (siblingHandle: SpawnedActorResolver<ChildMsg>): ActorCommand<ChildMsg> =>
            sequence(() => [send(siblingHandle, 'SIBLING'), kill(siblingHandle)]),
        ),
      ]);

      // Create mock handles for any spawned actors, mirroring the order of the instructions
      const outerHandle = createSpawnedActorValueResolver<ChildMsg>(0);
      const innerHandle = createSpawnedActorValueResolver<ChildMsg>(1);
      const siblingHandle = createSpawnedActorValueResolver<ChildMsg>(2);

      const instructions = compile(program);
      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 16,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_ACTOR_SPAWN,
          factory: {
            actor: childFactory,
            config: self,
          },
        } satisfies ActorSpawnOp<ActorHandle<ParentMsg>, ChildMsg, ParentMsg>,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 8,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: outerHandle,
          message: 'OUTER',
        } satisfies ActorSendOp<ChildMsg>,
        {
          type: OP_TYPE_ACTOR_SPAWN,
          factory: {
            actor: childFactory,
            config: self,
          },
        } satisfies ActorSpawnOp<ActorHandle<ParentMsg>, ChildMsg, ParentMsg>,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 3,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: innerHandle,
          message: 'INNER',
        } satisfies ActorSendOp<ChildMsg>,
        {
          type: OP_TYPE_ACTOR_KILL,
          target: innerHandle,
        } satisfies ActorKillOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_ACTOR_KILL,
          target: outerHandle,
        } satisfies ActorKillOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_ACTOR_SPAWN,
          factory: {
            actor: childFactory,
            config: self,
          },
        } satisfies ActorSpawnOp<ActorHandle<ParentMsg>, ChildMsg, ParentMsg>,
        {
          type: OP_TYPE_BLOCK_ENTER,
          length: 3,
        } satisfies BlockEnterOp,
        {
          type: OP_TYPE_ACTOR_SEND,
          target: siblingHandle,
          message: 'SIBLING',
        } satisfies ActorSendOp<ChildMsg>,
        {
          type: OP_TYPE_ACTOR_KILL,
          target: siblingHandle,
        } satisfies ActorKillOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        } satisfies BlockBreakOp,
      ]);
    });
  });

  describe('evaluate', () => {
    it('should spawn a child actor that executes and sends message to parent', async () => {
      const childFactory = act<ChildMsg>((_self, { outbox, complete: childComplete }) =>
        sequence(() => [send(outbox, 'CHILD_RAN'), childComplete()]),
      );

      const parentDef = act<ParentMsg>((self, { outbox, complete: parentComplete }) =>
        spawn(childFactory, self, (_childHandle) =>
          waitFor<ParentMsg, ParentMsg>(
            (msg): msg is ParentMsg => typeof msg === 'string',
            (msg) => sequence(() => [send(outbox, msg), parentComplete()]),
          ),
        ),
      );

      const scheduler = new AsyncScheduler<ParentMsg>((_ctx) => parentDef);

      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: 'CHILD_RAN' });

      const finalResult = await scheduler.next();
      expect(finalResult).toEqual({ done: true, value: undefined });
    });

    it('should allow parent to send message to spawned child', async () => {
      const echoChildFactory: SyncActorFactory<
        ActorHandle<ChildMsg>,
        ChildMsg,
        ParentMsg
      > = act<ChildMsg>((_self, { outbox, complete: childComplete }) =>
        waitFor<ChildMsg, ChildMsg>(
          (msg): msg is ChildMsg => typeof msg === 'string',
          (msgHandle) =>
            sequence(() => [
              send(
                outbox,
                readState(msgHandle, (msg) => msg.replace('I', 'O')),
              ),
              childComplete(),
            ]),
        ),
      );

      const parentDef = act<ParentMsg>((self, { outbox, complete: parentComplete }) =>
        spawn(echoChildFactory, self, (childHandle) =>
          sequence(() => [
            send(childHandle, 'PING'),
            waitFor<ParentMsg, ParentMsg>(
              (msg): msg is ParentMsg => typeof msg === 'string',
              (msg) => sequence(() => [send(outbox, msg), parentComplete()]),
            ),
          ]),
        ),
      );

      const scheduler = new AsyncScheduler<ParentMsg>((_ctx) => parentDef);

      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: 'PONG' });

      const finalResult = await scheduler.next();
      expect(finalResult).toEqual({ done: true, value: undefined });
    });
  });
});
