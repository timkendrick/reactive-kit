import { CustomHashable, hash, HASH, Hash } from './hash';

export class HashableError extends Error implements CustomHashable {
  public [HASH]: Hash;

  constructor(error: Error) {
    super(error.message);
    this.name = error.name;
    this.cause = error;
    this[HASH] = hash(HashableError.name, error.name, error.message, error.stack);
  }
}
