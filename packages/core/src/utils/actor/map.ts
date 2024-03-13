import { Actor, ActorHandle, HandlerAction, HandlerContext, HandlerResult } from '@trigger/types';

export class MapActor<T, T2> implements Actor<T> {
  private iteratee: (message: T) => T2;
  private next: ActorHandle<T2>;

  public constructor(iteratee: (message: T) => T2, next: ActorHandle<T2>) {
    this.iteratee = iteratee;
    this.next = next;
  }

  public handle(message: T, context: HandlerContext<T>): HandlerResult<T2> {
    return [HandlerAction.Send(this.next, this.iteratee(message))];
  }
}
