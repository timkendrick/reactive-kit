import type { SchedulerCommand } from '../types';

export const MESSAGE_SCHEDULER_COMMAND = '@reactive-kit/async-scheduler/command';

export type SchedulerCommandMessagePayload<T> = SchedulerCommand<T>;

export interface SchedulerCommandMessage<T> {
  type: typeof MESSAGE_SCHEDULER_COMMAND;
  payload: SchedulerCommandMessagePayload<T>;
}

export function createSchedulerCommandMessage<T>(
  command: SchedulerCommand<T>,
): SchedulerCommandMessage<T> {
  return { type: MESSAGE_SCHEDULER_COMMAND, payload: command };
}

export function isSchedulerCommandMessage(message: {
  type: unknown;
  payload: unknown;
}): message is SchedulerCommandMessage<unknown> {
  return message.type === MESSAGE_SCHEDULER_COMMAND;
}
