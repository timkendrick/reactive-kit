import { expect, test } from 'vitest';

import * as lib from './lib';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    and: lib.and,
    any: lib.any,
    hasActionType: lib.hasActionType,
    hasField: lib.hasField,
    hasMessagePayload: lib.hasMessagePayload,
    hasMessageType: lib.hasMessageType,
    initialMatchState: lib.initialMatchState,
    matchPattern: lib.matchPattern,
    not: lib.not,
    oneOf: lib.oneOf,
    oneOrMore: lib.oneOrMore,
    or: lib.or,
    parallel: lib.parallel,
    predicate: lib.predicate,
    repeat: lib.repeat,
    sentFrom: lib.sentFrom,
    sentTo: lib.sentTo,
    sequence: lib.sequence,
    zeroOrMore: lib.zeroOrMore,
  });
});
