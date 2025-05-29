export interface Message<T, V> {
  type: T;
  payload: V;
}

export function isMessage(message: unknown): message is Message<unknown, unknown> {
  return (
    typeof message === 'object' && message !== null && 'type' in message && 'payload' in message
  );
}
