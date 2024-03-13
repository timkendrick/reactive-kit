import {
  ActorHandle,
  HandlerAction,
  HandlerContext,
  HandlerResult,
  Actor,
} from '@reactive-kit/actor';

export class BroadcastActor<T> implements Actor<T> {
  private readonly targets: Array<ActorHandle<T>> = [];

  public constructor(targets: Iterable<ActorHandle<T>>) {
    for (const target of targets) {
      this.targets.push(target);
    }
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<unknown> {
    return this.targets.map((target) => HandlerAction.Send(target, message));
  }
}
