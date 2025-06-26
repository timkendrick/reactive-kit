import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface TerminalProps {
  className?: string;
  children: Array<ReactElement<typeof TerminalLine>>;
}

export function Terminal(props: TerminalProps): ReactNode {
  const { className, children } = props;
  return (
    <div
      className={cn(
        'rounded-md lg:rounded-lg border border-border shadow-sm bg-background',
        className,
      )}
    >
      <div className="flex flex-col gap-y-2 border-b border-border px-3 py-2 lg:py-3">
        <div className="flex flex-row gap-x-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </div>
      </div>
      <pre className="p-3 lg:p-4 bg-slate-800 text-slate-300 rounded-b-md overflow-auto">
        <code className="grid gap-y-1">{children}</code>
      </pre>
    </div>
  );
}

export interface TerminalLineProps {
  className?: string;
  children: ReactNode;
}

export function TerminalLine(props: TerminalLineProps): ReactNode {
  const { className, children } = props;
  return (
    <div className={cn('text-xs lg:text-sm font-normal tracking-tight', className)}>{children}</div>
  );
}
