import type { ReactNode } from 'react';

import { Badge } from './ui/badge';

import { cn } from '@/utils/cn';

interface CodeBlockProps {
  className?: string;
  title?: string;
  source: string;
  highlightLines?: Array<number>;
}

export function CodeBlock(props: CodeBlockProps): ReactNode {
  const { className, title, source } = props;
  return (
    <div className={cn('relative w-full rounded-lg bg-slate-900 p-4 font-mono text-sm', className)}>
      {title && (
        <Badge className="bg-slate-700 text-xs rounded-xs rounded-l-none rounded-t-none pr-1 mb-2 -ml-4 -mt-4 select-none">
          {title}
        </Badge>
      )}
      <div className="text-xs overflow-auto" dangerouslySetInnerHTML={{ __html: source }} />
    </div>
  );
}
