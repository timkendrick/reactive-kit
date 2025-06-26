import type { ReactNode } from 'react';

import { DotPattern } from '@/components/magicui/dot-pattern';
import { Button } from '@/components/ui/button';

interface GetStartedSectionProps {
  githubUrl: string;
  examplesUrl: string;
}

export function GetStartedSection(props: GetStartedSectionProps): ReactNode {
  const { githubUrl, examplesUrl } = props;
  return (
    <footer className="py-16 border-t border-border/50 border-dashed relative">
      <DotPattern className="mask-linear-115 mask-linear-to-50% mask-linear-to-transparent" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl tracking-tight lg:text-5xl font-bold mb-8">
            Try ReactiveKit today
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              asChild
              className="w-60 rounded-lg px-6 py-2 font-medium text-white transform transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            >
              <a href={githubUrl}>Try it on GitHub</a>
            </Button>
            <Button
              asChild
              className="w-60 rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-black transform transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900"
            >
              <a href={examplesUrl}>Code Examples</a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
