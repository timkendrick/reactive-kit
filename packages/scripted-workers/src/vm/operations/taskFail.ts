export const OP_TYPE_TASK_FAIL = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/task-fail',
);

/**
 * VM operation: FAIL_TASK
 * Marks the current task as failed with an error.
 */
export interface TaskFailOp {
  type: typeof OP_TYPE_TASK_FAIL;
  error: Error;
}
