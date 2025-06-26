import type { ReactNode } from 'react';

import { Badge } from './ui/badge';

export interface CodeProps {
  children: ReactNode;
}

export function Code(props: CodeProps): ReactNode {
  const { children } = props;
  return (
    <Badge
      className="rounded-sm text-[length:75%] py-0 bg-muted/50 border-border/50 text-foreground/80"
      variant="outline"
    >
      <code>{children}</code>
    </Badge>
  );
}
