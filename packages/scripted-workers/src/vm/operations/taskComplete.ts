export const OP_TYPE_TASK_COMPLETE = Symbol.for(
  '@reactive-kit/scripted-workers/vm/operations/task-complete',
);

/**
 * VM operation: TASK_COMPLETE
 * Marks the current task as complete.
 */
export interface TaskCompleteOp {
  type: typeof OP_TYPE_TASK_COMPLETE;
}
