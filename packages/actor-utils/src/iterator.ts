import {
  HandlerAction,
  type AsyncTaskFactory,
  type AsyncTaskInbox,
  type AsyncTaskOutbox,
  type AsyncTaskType,
  type HandlerResult,
} from '@reactive-kit/actor';

/**
 * Creates an AsyncTaskFactory that wraps an AsyncIterator.
 *
 * This function adapts an `AsyncIterator` to the actor system's `AsyncTask` interface.
 * It processes incoming messages from the actor's inbox and feeds them to the iterator.
 * It then takes the results yielded by the iterator and sends them to the actor's outbox.
 *
 * This implementation uses a non-blocking approach similar to RxJS `switchMap`.
 * When a new message arrives from the inbox, it cancels any ongoing processing
 * of the previous message by the iterator and starts processing the new message.
 *
 * @template C The type of the configuration object passed to the factory.
 * @template T The type of messages handled by the actor (inbox and iterator input/output).
 * @param type The type of the asynchronous task.
 * @param factory A function that takes a configuration object and returns the `AsyncIterator`.
 * @returns An `AsyncTaskFactory` configured with the provided iterator logic.
 */
export function fromAsyncIteratorFactory<C, T>(
  type: AsyncTaskType,
  factory: (config: C) => AsyncIterator<HandlerResult<T>, HandlerResult<T> | null, T | undefined>,
): AsyncTaskFactory<C, never, T> {
  return {
    type,
    async: true,
    factory: (config, self) => {
      const iterator = factory(config);
      return async function (inbox: AsyncTaskInbox<T>, outbox: AsyncTaskOutbox<T>): Promise<void> {
        type InputResult = IteratorResult<T, null>;
        type OutputResult = IteratorResult<HandlerResult<T>, HandlerResult<T> | null>;
        let currentInputTask: Promise<InputMessage<InputResult>> | null = null;
        let currentOutputTask: Promise<OutputMessage<OutputResult>> | null = null;
        // Subscribe to the inbox and output message streams
        currentInputTask = withMessageType(MessageType.Input, inbox.next());
        currentOutputTask = withMessageType(MessageType.Output, iterator.next());
        try {
          while (true) {
            const nextAction =
              currentInputTask !== null && currentOutputTask !== null
                ? Promise.race([currentInputTask, currentOutputTask])
                : currentInputTask || currentOutputTask || null;
            // If there are no remaining inbox messages, and the iterator is done, we're done
            if (nextAction === null) break;
            const action = await nextAction;
            switch (action.type) {
              case MessageType.Input: {
                currentInputTask = null; // Consume the task
                const inputResult = action.value;
                // Don't request any more inbox items if the iterator is done
                if (inputResult.done) break;
                // Immediately start fetching the next inbox message
                currentInputTask = withMessageType(MessageType.Input, inbox.next());
                // Re-trigger the iterator with the new value, abandoning previous work
                const message: T = inputResult.value;
                currentOutputTask = withMessageType(MessageType.Output, iterator.next(message));
                break;
              }
              case MessageType.Output: {
                currentOutputTask = null; // Consume the task
                const outputResult = action.value;
                const { value: actions, done: iteratorDone } = outputResult;
                // Combine actions, adding an action to terminate the current task if the iterator is done
                const combinedActions =
                  actions !== null && iteratorDone
                    ? [...actions, HandlerAction.Kill(self)]
                    : iteratorDone
                      ? [HandlerAction.Kill(self)]
                      : actions;
                if (combinedActions !== null) outbox(combinedActions);
                // If the iterator is now done, we have finished processing the last value it received.
                // It's now idle, waiting for a new value from the inbox via the race.
                // currentIteratorTask remains null
                if (iteratorDone) break;
                // Iterator yielded an intermediate value, start fetching the next iterator message
                currentOutputTask = withMessageType(MessageType.Output, iterator.next());
                break;
              }
            }
          }
        } finally {
          // Attempt graceful cleanup if the iterator supports it
          if (typeof iterator.return === 'function') {
            await iterator.return();
          }
        }
      };
    },
  };
}

const enum MessageType {
  Input,
  Output,
}

type InputMessage<T> = TaggedValue<MessageType.Input, T>;
type OutputMessage<T> = TaggedValue<MessageType.Output, T>;

function withMessageType<T extends MessageType, V>(
  type: T,
  awaitedValue: Promise<V>,
): Promise<TaggedValue<T, V>> {
  return awaitedValue.then((value) => ({ type, value }));
}

interface TaggedValue<T, V> {
  type: T;
  value: V;
}
