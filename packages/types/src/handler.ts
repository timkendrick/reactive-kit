import { Enum, EnumVariant, VARIANT, instantiateEnum } from '@trigger/utils';
import { Stream } from './stream';

export type ProcessId = number;

export interface Handler<I extends HandlerMessage<unknown>, O extends HandlerMessage<unknown> = I> {
  events(input: Stream<HandlerMessage<unknown>>): Stream<Array<I>>;
  handle(message: I, context: HandlerContext): HandlerResult<O>;
}

export interface HandlerMessage<T> {
  type: T;
}

export interface HandlerContext {
  readonly pid: ProcessId;
  generatePid(): ProcessId;
}

export type HandlerResult<T> = Array<HandlerAction<T>> | null;

const enum HandlerActionType {
  Send = 'Send',
}

export type HandlerAction<T> = Enum<{
  [HandlerActionType.Send]: {
    pid: ProcessId;
    message: T;
  };
}>;

export const HandlerAction = {
  [HandlerActionType.Send]: Object.assign(
    function Send<T>(
      pid: ProcessId,
      message: T,
    ): EnumVariant<HandlerAction<T>, HandlerActionType.Send> {
      return instantiateEnum(HandlerActionType.Send, { pid, message });
    },
    {
      [VARIANT]: HandlerActionType.Send,
      is: function is<T>(
        value: HandlerAction<T>,
      ): value is EnumVariant<HandlerAction<T>, HandlerActionType.Send> {
        return value[VARIANT] === HandlerActionType.Send;
      },
    },
  ),
};
