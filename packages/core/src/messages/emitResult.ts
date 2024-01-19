import { type EvaluationResult, type Message, type Reactive } from '@trigger/types';

export const MESSAGE_EMIT_RESULT = 'core::emitResult';

export interface EmitResultMessage<T> extends Message<typeof MESSAGE_EMIT_RESULT> {
  expression: Reactive<T>;
  result: EvaluationResult<T>;
}

export function createEmitResultMessage<T>(
  expression: Reactive<T>,
  result: EvaluationResult<T>,
): EmitResultMessage<T> {
  return {
    type: MESSAGE_EMIT_RESULT,
    expression,
    result,
  };
}
