import {
  HandlerAction,
  type Actor,
  type ActorHandle,
  type HandlerContext,
  type HandlerResult,
} from '@reactive-kit/actor';

export class ScanActor<T, S> implements Actor<T, S> {
  private state: S;
  private reducer: (state: S, action: T) => S;
  private next: ActorHandle<S>;

  public constructor(initialState: S, reducer: (state: S, action: T) => S, next: ActorHandle<S>) {
    this.state = initialState;
    this.reducer = reducer;
    this.next = next;
  }

  public handle(message: T, _context: HandlerContext<T>): HandlerResult<S> {
    const result = this.reducer(this.state, message);
    this.state = result;
    return [HandlerAction.Send({ target: this.next, message: result })];
  }
}
