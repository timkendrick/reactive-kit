import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from '@/components/CodeBlock';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { executeTrade, riskAlert } from '@/examples';

export function ScriptedWorkersSection(): ReactNode {
  return (
    <section className="border-t border-border/50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="md:flex md:items-center md:gap-2 xl:relative">
          <Badge
            className="mb-4 md:mb-0 xl:absolute xl:my-4 xl:mr-4 xl:right-full"
            variant="outline"
          >
            Deep-dive
          </Badge>
          <div className="md:flex-none flex gap-2 items-center">
            <Settings className="w-8 h-8 -mt-1" />
            <h2 className="text-2xl md:text-3xl tracking-tight font-bold mb-2 whitespace-nowrap">
              Scripted Workers
            </h2>
          </div>
        </div>
        <p className="text-muted-foreground text-sm tracking-tight font-semibold mb-6">
          Stateful, repeatable process orchestration
        </p>
        <p className="text-lg text-subtitle mb-6">
          Scripted Workers are composable runners for{' '}
          <strong>deterministic procedural workflows</strong>,<br />
          suitable for both short-lived one-off tasks and long-running event-driven services.
        </p>
        <div className="lg:flex lg:flex-row lg:space-x-12">
          <div className="lg:flex-1">
            <div>
              <p className="text-md text-muted-foreground mb-6">
                Scripted Workers provide a structured way to orchestrate multi-step operations,
                ensuring each step is executed according to strict logical rules. This makes them
                ideal for anything from data processing pipelines to user interaction flows.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                Build complex workflows using powerful control flow primitives for operation
                sequences, conditional branching, iterative loops, internal state management, and
                message-passing communication.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                Determinism is enforced by operating solely on input messages and internal state,
                with all side effects mediated via the Intelligent Transport Layer to ensure perfect
                replayability.
              </p>
            </div>
          </div>

          <div className="lg:flex-1 overflow-hidden">
            <Tabs defaultValue="server">
              <TabsList className="w-full">
                <TabsTrigger value="server">Task worker</TabsTrigger>
                <TabsTrigger value="client">Service worker</TabsTrigger>
              </TabsList>
              <TabsContent value="server">
                <CodeBlock source={executeTrade} />
              </TabsContent>
              <TabsContent value="client">
                <CodeBlock source={riskAlert} />
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
                  The intuitive declarative API and powerful logic combinators make it simple to
                  build up clear, testable, and maintainable logic.
                </>
              ),
            },
            {
              title: 'Deterministic Stateful Logic',
              description: (
                <>
                  Define synchronous and asynchronous workflows step-by-step, ensuring predictable,
                  testable behavior and state transitions.
                </>
              ),
            },
            {
              title: 'Message-Driven Communication',
              description: (
                <>
                  Interact with other workers and components via a simple actor-style
                  message-passing API that integrates with ReactiveKit&rsquo;s transport layer.
                </>
              ),
            },
          ].map(({ title, description }) => ({ icon: null, title, description }))}
        />
      </div>
    </section>
  );
}
