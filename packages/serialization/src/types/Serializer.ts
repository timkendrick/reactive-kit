export interface Serializer<I, O> {
  serialize(value: I): O;
}
