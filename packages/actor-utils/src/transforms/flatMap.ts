import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

export class FlatMapActor<T, T2> implements Actor<T, T2> {
  private iteratee: (message: T) => Array<T2>;
  private next: ActorHandle<T2>;

  public constructor(iteratee: (message: T) => Array<T2>, next: ActorHandle<T2>) {
    this.iteratee = iteratee;
    this.next = next;
  }

  public handle(message: T, _context: HandlerContext<T>): HandlerResult<T2> {
    return this.iteratee(message).map((message) =>
      HandlerAction.Send({ target: this.next, message }),
    );
  }
}
