import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

export class FilterActor<T, T2 extends T = T> implements Actor<T, T2> {
  private predicate: (message: T) => message is T2;
  private next: ActorHandle<T2>;

  public constructor(predicate: (message: T) => message is T2, next: ActorHandle<T2>);
  public constructor(predicate: (message: T) => boolean, next: ActorHandle<T2>);
  public constructor(predicate: (message: T) => message is T2, next: ActorHandle<T2>) {
    this.predicate = predicate;
    this.next = next;
  }

  public handle(message: T, _context: HandlerContext<T>): HandlerResult<T2> {
    if (!this.predicate(message)) return null;
    return [HandlerAction.Send(this.next, message)];
  }
}
