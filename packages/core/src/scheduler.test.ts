import { describe, expect, test } from 'vitest';
import { Scheduler } from './scheduler';
import { ConditionTree, PollStatus, SIGNAL, StatefulValue } from '@trigger/types';
import { never, once } from './signal';
import { createStateful } from './state';
import { EMPTY_DEPENDENCIES, flattenConditionTree } from './core';

describe(Scheduler, () => {
  describe('poll', () => {
    test('static root', () => {
      const root = 'foo';
      const scheduler = new Scheduler(root);
      expect(scheduler.poll()).toEqual(PollStatus.Ready('foo'));
    });

    describe('signal root', () => {
      test('sync signal', () => {
        const root = once('foo');
        const scheduler = new Scheduler(root);
        expect(scheduler.poll()).toEqual(PollStatus.Ready('foo'));
      });

      test('empty signal', () => {
        const root = never();
        const scheduler = new Scheduler(root);
        expect(scheduler.poll()).toEqual(PollStatus.Pending(null));
      });
    });

    describe('stateful root', () => {
      test('no dependencies', () => {
        const root = createStateful((state) => ({
          value: StatefulValue.Resolved('foo'),
          dependencies: EMPTY_DEPENDENCIES,
        }));
        const scheduler = new Scheduler(root);
        expect(scheduler.poll()).toEqual(PollStatus.Ready('foo'));
      });
    });
  });
});
