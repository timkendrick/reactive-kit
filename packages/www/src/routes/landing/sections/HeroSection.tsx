import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { DotPattern } from '@/components/magicui/dot-pattern';
import { Button } from '@/components/ui/button';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';
import { cn } from '@/utils/cn';

interface HeroSectionProps {
  githubUrl: string;
  learnMoreUrl: string;
}

export function HeroSection(props: HeroSectionProps): ReactNode {
  const { githubUrl, learnMoreUrl } = props;
  return (
    <header className="py-20 inset-shadow-sm border-t border-border/50 relative">
      <DotPattern className="mask-linear-115 mask-linear-to-50% mask-linear-to-transparent" />
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h1 className="bg-primary text-primary-foreground text-5xl md:text-6xl font-bold mb-6 inline-block p-4">
          ReactiveKit
        </h1>

        <motion.h1
          initial={{
            opacity: 0,
          }}
          whileInView={{
            opacity: 1,
          }}
          className={cn(
            'relative mb-6 text-4xl leading-tight lg:leading-normal font-bold tracking-tight text-zinc-700 md:text-4xl dark:text-zinc-100',
          )}
        >
          <div className="inline-block">The Full-Stack Framework for</div>
          <div>
            <ContainerTextFlip
              className="text-5xl md:text-7xl my-2 md:my-0"
              words={['Deterministic', 'Debuggable', 'Testable', 'Replayable', 'Observable']}
            />
          </div>
          <div className="inline-block">Real-Time Distributed Systems</div>
        </motion.h1>
        <p className="text-sm lg:text-base max-w-2xl mt-2 mb-8 md:mt-8 md:mb-4 mx-auto text-neutral-500 text-center font-normal tracking-tight">
          From data-processing pipelines to interactive UIs, ReactiveKit gives you the building
          blocks to compose robust, real-time distributed systems that are testable and debuggable
          by design.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            asChild
            className="w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            <a href={githubUrl}>Try it on GitHub</a>
          </Button>
          <Button
            asChild
            className="w-60 transform rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900"
          >
            <a href={learnMoreUrl}>Learn More</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
