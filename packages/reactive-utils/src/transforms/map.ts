import { assignCustomHash, hash, Hashable, type CustomHashable } from '@reactive-kit/hash';
import {
  type Expression,
  createAsync,
  createGeneratorStateMachine,
  GeneratorStateMachine,
} from '@reactive-kit/types';

interface MapGeneratorStateMachine<T extends Hashable, V extends Hashable>
  extends GeneratorStateMachine<
      MapGeneratorArgs<T, V>,
      MapGeneratorLocals<T>,
      MapGeneratorIntermediates,
      MapGeneratorStatics,
      Expression<T>,
      T,
      Hashable,
      V
    >,
    CustomHashable {}

interface MapGeneratorArgs<T extends Hashable, V extends Hashable>
  extends Record<string, Hashable> {
  expression: Expression<T>;
  transform: ((result: T) => V) & Hashable;
}

interface MapGeneratorLocals<T extends Hashable> extends Record<string, Hashable> {
  value: T;
}

interface MapGeneratorIntermediates extends Record<string, Hashable> {}

interface MapGeneratorStatics extends Record<string, unknown> {}

const MAP_GENERATOR: MapGeneratorStateMachine<any, any> = assignCustomHash(
  hash('@reactive-kit/symbols/transform/map'),
  createGeneratorStateMachine<
    MapGeneratorArgs<Hashable, Hashable>,
    MapGeneratorLocals<Hashable>,
    MapGeneratorIntermediates,
    MapGeneratorStatics,
    Hashable,
    Hashable,
    Hashable,
    Hashable
  >(
    /*
    async function map(expression, transform) {
      const value = await expression;
      return transform(value);
    }
    */
    function (_context) {
      switch ((_context.state.prev = _context.state.next)) {
        case 0:
          _context.state.next = 2;
          return _context['yield'](_context.state.args.expression);
        case 2:
          _context.state.locals.value = _context.sent;
          return _context.abrupt(
            'return',
            _context.state.args.transform(_context.state.locals.value),
          );
        case 4:
        case 0x1fffffffffffff:
        default:
          return _context.stop();
      }
    },
    {
      params: ['expression', 'transform'],
      locals: ['value'],
      intermediates: [],
      statics: [],
      tryLocsList: null,
    },
  ),
);

export function map<T extends Hashable, V extends Hashable>(
  expression: Expression<T>,
  transform: ((result: T) => V) & Hashable,
): Expression<V> {
  return createAsync(MAP_GENERATOR as MapGeneratorStateMachine<T, V>, [expression, transform]);
}
