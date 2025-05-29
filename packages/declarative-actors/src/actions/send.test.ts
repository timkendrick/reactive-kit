import { describe, expect, it } from 'vitest';

import { AsyncScheduler } from '@reactive-kit/scheduler';

import { act } from '../act';
import { readState } from '../state/readState';
import {
  createReadStateValueResolver,
  createSpawnedActorValueResolver,
  createStateRef,
} from '../types';
import { compile } from '../vm/compile';
import { OP_TYPE_ACTOR_SEND } from '../vm/operations/actorSend';
import { OP_TYPE_BLOCK_BREAK } from '../vm/operations/blockBreak';
import { OP_TYPE_BLOCK_ENTER_STATE } from '../vm/operations/blockEnterState';

import { send } from './send';
import { sequence } from './sequence';
import { spawn } from './spawn';
import { waitFor } from './waitFor';
import { withState } from './withState';

describe(send, () => {
  describe(compile, () => {
    it('should compile send action with literal message', () => {
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      const message = 'HELLO';
      const command = send(targetHandle, message);

      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message,
        },
      ]);
    });

    it('should compile send action with message resolved from state', () => {
      type TestState = { message: string };
      const targetHandle = createSpawnedActorValueResolver<string>(0);
      const initialStateFactory = () => ({ message: 'FROM_STATE' });
      const selector = (s: TestState) => s.message;

      const command = withState<never, TestState>(initialStateFactory, (stateHandle) => {
        const stateResolver = readState(stateHandle, selector);
        return send(targetHandle, stateResolver);
      });

      // Create mock handles for any state references, mirroring the order of the instructions
      const messageRef = createStateRef<TestState>(0);

      const instructions = compile(command);

      expect(instructions).toEqual([
        {
          type: OP_TYPE_BLOCK_ENTER_STATE,
          length: 2,
          initialState: initialStateFactory,
        },
        {
          type: OP_TYPE_ACTOR_SEND,
          target: targetHandle,
          message: createReadStateValueResolver(messageRef, selector),
        },
        {
          type: OP_TYPE_BLOCK_BREAK,
          blockIndex: 0,
        },
      ]);
    });
  });

  describe('evaluate', () => {
    it('should send a literal message to the main actor outbox', async () => {
      type TestMessage = string;

      const actor = act<TestMessage>((_self, { outbox }) => send(outbox, 'DONE'));

      const scheduler = new AsyncScheduler<TestMessage>((_ctx) => actor);

      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: 'DONE' });

      const result2 = await scheduler.next();
      expect(result2).toEqual({ done: true, value: undefined });
    });

    it('should send a literal message to a spawned actor', async () => {
      type TestMessage = string;
      type EchoMessage = string;

      // Simple echo actor: waits for any message, sends it back to outbox
      const echoActor = act<EchoMessage>((_self, { outbox }) =>
        waitFor<EchoMessage, EchoMessage>(
          (msg): msg is EchoMessage => typeof msg === 'string', // Just wait for any string
          (msgHandle) =>
            send(
              outbox,
              readState(msgHandle, (msg) => msg.replace('I', 'O')),
            ),
        ),
      );

      // Main actor: spawns echo, sends PING, awaits response
      const mainActor = act<TestMessage>((self, { outbox }) =>
        spawn(echoActor, self, (echoHandle) =>
          sequence(() => [
            send(echoHandle, 'PING'),
            waitFor<EchoMessage, EchoMessage>(
              (msg): msg is EchoMessage => typeof msg === 'string',
              (msgHandle) => send(outbox, msgHandle),
            ),
          ]),
        ),
      );

      const scheduler = new AsyncScheduler<EchoMessage>((_ctx) => mainActor);

      // Expect the echoed message
      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: 'PONG' });

      // Actors complete after sending/echoing once.
      const finalResult = await scheduler.next();
      expect(finalResult).toEqual({ done: true, value: undefined });
    });

    it('should send a message resolved from state to the target actor', async () => {
      type TestState = { data: string };
      type EchoMessage = string;

      const echoActor = act<EchoMessage>((_self, { outbox }) =>
        waitFor<EchoMessage, EchoMessage>(
          (msg): msg is EchoMessage => typeof msg === 'string',
          (msgHandle) =>
            send(
              outbox,
              readState(msgHandle, (msg) => msg.replace('I', 'O')),
            ),
        ),
      );

      const mainActor = act<EchoMessage>((self, { outbox }) =>
        withState<EchoMessage, TestState>(
          () => ({ data: 'PING' }),
          (stateHandle) =>
            sequence(() => [
              spawn(echoActor, self, (echoHandle) =>
                send(
                  echoHandle,
                  readState(stateHandle, (s) => s.data),
                ),
              ),
              waitFor<EchoMessage, EchoMessage>(
                (msg): msg is EchoMessage => typeof msg === 'string',
                (msgHandle) => send(outbox, msgHandle),
              ),
            ]),
        ),
      );

      const scheduler = new AsyncScheduler<EchoMessage>((_ctx) => mainActor);

      const result = await scheduler.next();
      expect(result).toEqual({ done: false, value: 'PONG' });

      const finalResult = await scheduler.next();
      expect(finalResult).toEqual({ done: true, value: undefined });
    });
  });
});
