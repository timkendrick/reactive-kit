import type {
  ActorKillOp,
  ActorSendOp,
  ActorSpawnOp,
  BlockBreakIfOp,
  BlockBreakOp,
  BlockEnterAwaitOp,
  BlockEnterOp,
  BlockEnterStateOp,
  DelayOp,
  LoopContinueOp,
  LoopEnterOp,
  LoopExitOp,
  NoopOp,
  StateUpdateOp,
  TaskCompleteOp,
  TaskFailOp,
} from './operations';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type VmOperation =
  | ActorKillOp
  | ActorSendOp<any>
  | ActorSpawnOp<any, any, any>
  | BlockBreakOp
  | BlockBreakIfOp
  | BlockEnterAwaitOp
  | BlockEnterOp
  | BlockEnterStateOp<any>
  | DelayOp
  | LoopContinueOp
  | LoopEnterOp
  | LoopExitOp
  | NoopOp
  | StateUpdateOp<any>
  | TaskCompleteOp
  | TaskFailOp;
/* eslint-enable @typescript-eslint/no-explicit-any */
