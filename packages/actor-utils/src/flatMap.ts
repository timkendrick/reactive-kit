import {
  Actor,
  ActorHandle,
  HandlerAction,
  HandlerContext,
  HandlerResult,
} from '@reactive-kit/actor';

export class FlatMapActor<T, T2> implements Actor<T> {
  private iteratee: (message: T) => Array<T2>;
  private next: ActorHandle<T2>;

  public constructor(iteratee: (message: T) => Array<T2>, next: ActorHandle<T2>) {
    this.iteratee = iteratee;
    this.next = next;
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<T2> {
    return this.iteratee(message).map((message) => HandlerAction.Send(this.next, message));
  }
}
