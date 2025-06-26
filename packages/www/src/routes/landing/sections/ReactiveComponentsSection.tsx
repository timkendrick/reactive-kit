import { SquareActivity } from 'lucide-react';
import type { ReactNode } from 'react';

import { Code } from '@/components/Code';
import { CodeBlock } from '@/components/CodeBlock';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioWidget, usePortfolioSummary } from '@/examples';

export function ReactiveComponentsSection(): ReactNode {
  return (
    <section className="py-16 border-t border-border/50 border-dashed">
      <div className="max-w-6xl mx-auto px-6">
        <div className="md:flex md:items-center md:gap-2 xl:relative">
          <Badge
            className="mb-4 md:mb-0 xl:absolute xl:my-4 xl:mr-4 xl:right-full"
            variant="outline"
          >
            Deep-dive
          </Badge>
          <div className="md:flex-none flex gap-2 items-center">
            <SquareActivity className="w-8 h-8 -mt-1" />
            <h2 className="text-2xl md:text-3xl tracking-tight font-bold mb-2 whitespace-nowrap">
              Reactive Components
            </h2>
          </div>
        </div>
        <p className="text-muted-foreground text-sm tracking-tight font-semibold mb-6">
          Define complex live computations anywhere on your stack
        </p>
        <p className="text-lg text-subtitle mb-6">
          Reactive Components express a <strong>live computation</strong>, written as an{' '}
          <Code>async</Code> function.
        </p>
        <div className="lg:flex lg:flex-row lg:space-x-12">
          <div className="lg:flex-1">
            <div>
              <p className="text-md text-muted-foreground mb-6">
                The output of a Reactive Component can be a UI element, a streaming value to be
                exposed via an API, or any other serializable data structure, allowing the same
                components to be used interchangeably on both front-end and back-end.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                Unlike the components you would typically encounter in UI frameworks, Reactive
                Components are managed by ReactiveKit&rsquo;s runtime, enabling deterministic
                execution, efficient incremental re-computation, and causal logging across the
                entire stack.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                Just use <Code>await</Code> keywords wherever you read from a live data stream, and
                ReactiveKit ensures it&rsquo;s always up-to-date with the underlying data,
                automatically.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                <Code>await</Code> calls can be chained to combine dependent data streams
                intuitively: ReactiveKit performs dynamic joining in the background, so nested
                dependencies stay synchronized without any manual coordination.
              </p>
            </div>
          </div>

          <div className="lg:flex-1">
            <Tabs defaultValue="server">
              <TabsList className="w-full">
                <TabsTrigger value="server">Server</TabsTrigger>
                <TabsTrigger value="client">Client</TabsTrigger>
              </TabsList>
              <TabsContent value="server">
                <CodeBlock source={usePortfolioSummary} />
              </TabsContent>
              <TabsContent value="client">
                <CodeBlock source={PortfolioWidget} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <FeatureGrid
          itemsPerRow={3}
          features={[
            {
              title: 'Declarative & Composable',
              description: (
                <>
                  Focus on the &quot;what&quot;, not the &quot;how&quot;. Build up arbitrarily
                  complex component logic, while ReactiveKit keeps everything in sync.
                </>
              ),
            },
            {
              title: 'Efficient Updates',
              description: (
                <>
                  Built-in intelligent dependency caching ensures only the outputs that have changed
                  are re-evaluated, ensuring your application stays performant at scale.
                </>
              ),
            },
            {
              title: 'Truly Full-Stack',
              description: (
                <>
                  Use the same familiar syntax to build dynamic user interface elements on the
                  front-end, and to define reactive data transformations and pipelines on the
                  backend.
                </>
              ),
            },
          ].map(({ title, description }) => ({ icon: null, title, description }))}
        />
      </div>
    </section>
  );
}
