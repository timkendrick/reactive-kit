declare global {
  interface JSON {
    rawJSON(value: string): RawJSON;
  }
}

/**
 * Raw JSON token, as specified in https://github.com/tc39/proposal-json-parse-with-source
 */
export interface RawJSON {
  readonly rawJSON: string;
}
