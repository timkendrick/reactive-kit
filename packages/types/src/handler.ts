import { Enum, EnumVariant, VARIANT, instantiateEnum } from '@trigger/utils';

export type ProcessId = number;

export interface Handler<I, O> {
  handle(message: I): O;
}

export interface HandlerInput<T> {
  message: T;
  self: ProcessId;
}

export type HandlerResult<T> = Array<HandlerAction<T>>;

export const enum HandlerActionType {
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
      is: function is<T>(
        value: HandlerAction<T>,
      ): value is EnumVariant<HandlerAction<T>, HandlerActionType.Send> {
        return value[VARIANT] === HandlerActionType.Send;
      },
    },
  ),
};
