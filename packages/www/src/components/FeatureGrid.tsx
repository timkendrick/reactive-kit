import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface FeatureGridProps {
  className?: string;
  itemsPerRow: 2 | 3 | 4;
  features: Array<{
    icon: ReactNode;
    title: string;
    description: ReactNode;
  }>;
}

export function FeatureGrid(props: FeatureGridProps) {
  const { className, features, itemsPerRow } = props;
  return (
    <div
      className={cn(
        'grid grid-cols-1 relative z-10 py-10 max-w-7xl mx-auto',
        itemsPerRow === 2 && 'md:grid-cols-2',
        itemsPerRow === 3 && 'md:grid-cols-3',
        itemsPerRow === 4 && 'md:grid-cols-4',
        className,
      )}
    >
      {features.map(({ title, description, icon }, index) => (
        <Feature
          key={index}
          index={index}
          title={title}
          description={description}
          icon={icon}
          itemsPerRow={itemsPerRow}
          numItems={features.length}
        />
      ))}
    </div>
  );
}

interface FeatureProps {
  className?: string;
  icon: ReactNode;
  title: string;
  description: ReactNode;
  index: number;
  itemsPerRow: 2 | 3 | 4;
  numItems: number;
}

export function Feature(props: FeatureProps) {
  const { className, title, description, icon, index, itemsPerRow, numItems } = props;
  const numRows = Math.ceil(numItems / itemsPerRow);
  const indexWithinRow = index % itemsPerRow;
  const isFirstWithinRow = indexWithinRow === 0;
  const rowIndex = Math.floor(index / itemsPerRow);
  const finalRowIndex = numRows - 1;
  const isLastRow = rowIndex === finalRowIndex;
  return (
    <div
      className={cn(
        'flex flex-col border-dashed md:border-r py-10 not-first:border-t md:not-first:border-t-0',
        isFirstWithinRow && 'md:border-l',
        !isLastRow && 'md:border-b',
        className,
      )}
    >
      <div className="mb-4 relative px-10 text-neutral-600">{icon}</div>
      <div className="text-lg font-bold mb-2 relative px-10 text-neutral-800">{title}</div>
      <p className="text-sm text-neutral-600 max-w-xs px-10">{description}</p>
    </div>
  );
}
