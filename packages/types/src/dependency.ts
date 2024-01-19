import { Enum } from '@trigger/utils';
import { type StateToken } from './state';

const enum DependencyTreeType {
  Empty = 'Empty',
  Unit = 'Unit',
  Pair = 'Pair',
  Multiple = 'Multiple',
}

export type DependencyTree = Enum<{
  [DependencyTreeType.Empty]: void;
  [DependencyTreeType.Unit]: {
    value: StateToken;
  };
  [DependencyTreeType.Pair]: {
    left: DependencyTree;
    right: DependencyTree;
  };
  [DependencyTreeType.Multiple]: {
    children: Array<DependencyTree>;
  };
}>;

export const DependencyTree = Enum.create<DependencyTree>({
  [DependencyTreeType.Empty]: true,
  [DependencyTreeType.Unit]: true,
  [DependencyTreeType.Pair]: true,
  [DependencyTreeType.Multiple]: true,
});
