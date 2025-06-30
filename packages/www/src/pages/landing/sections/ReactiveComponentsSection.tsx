import type { ReactNode } from 'react';

import { CodeBlock, CodeLine, CodeToken } from '@/components/CodeBlock';

export function ReactiveComponentsSection(): ReactNode {
  return (
    <section className="bg-white py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">⚡ Reactive Components</h2>
            <p className="text-gray-400 mb-6">
              Define complex live computations anywhere on the stack
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Reactive Components express a <strong>live computation</strong>, written as an{' '}
              <code>async</code> function.
            </p>
            <p className="text-md text-gray-600 mb-6">
              Unlike standard UI framework components, Reactive Components are managed by
              ReactiveKit's runtime, enabling automatic dependency tracking, efficient incremental
              re-computation, and causal logging across the entire stack.
            </p>
            <p className="text-md text-gray-600 mb-6">
              Just use <code>await</code> keywords wherever you read from a live data stream, and
              ReactiveKit ensures it's always up-to-date with the underlying data, automatically.
            </p>
            <p className="text-md text-gray-600 mb-6">
              The output of a Reactive Component can be a UI element, a streaming value to be
              exposed via an API, or any other serializable data structure, allowing the same
              component to be used interchangeably on both front-end and back-end.
            </p>

            <div className="text-sm space-y-4 mb-6">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>
                  <strong>Declarative & Composable</strong>
                  <br />
                  Focus on the "what," not the "how." Build up arbitrarily complex component logic,
                  while ReactiveKit keeps everything in sync.
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>
                  <strong>Efficient Updates</strong>
                  <br />
                  Built-in intelligent dependency caching ensures only the outputs that have changed
                  are re-evaluated, ensuring your application stays performant at scale.
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>
                  <strong>Truly Full-Stack</strong>
                  <br />
                  Use the same familiar syntax to build both dynamic, real-time user interface
                  elements on the front-end, and to define reactive data transformations and
                  services on the backend.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Frontend Example */}
            <CodeBlock title="PortfolioOverview.jsx">
              <CodeLine>
                <CodeToken color="blue">import</CodeToken>{' '}
                <CodeToken color="white">{'{ useMarketExposure, useOpenOrders }'}</CodeToken>{' '}
                <CodeToken color="blue">from</CodeToken>{' '}
                <CodeToken color="orange">'@reactive-kit/finance-hooks'</CodeToken>;
              </CodeLine>
              <div className="h-2"></div>
              <CodeLine>
                <CodeToken color="blue">async function</CodeToken>{' '}
                <CodeToken color="yellow">PortfolioOverview</CodeToken>() {'{'}
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="purple">const</CodeToken> marketExposure ={' '}
                <CodeToken color="purple">await</CodeToken>{' '}
                <CodeToken color="green">useMarketExposure</CodeToken>();{' '}
                <CodeToken color="gray">// Live data stream</CodeToken>
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="purple">const</CodeToken> openOrders ={' '}
                <CodeToken color="purple">await</CodeToken>{' '}
                <CodeToken color="green">useOpenOrders</CodeToken>();{' '}
                <CodeToken color="gray">// Live data stream</CodeToken>
              </CodeLine>
              <div className="h-2"></div>
              <CodeLine indent={1}>
                <CodeToken color="gray">// Combine and format for display</CodeToken>
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="purple">return</CodeToken> {'{'}
              </CodeLine>
              <CodeLine indent={2}>totalExposure: marketExposure.total,</CodeLine>
              <CodeLine indent={2}>exposureByAsset: marketExposure.byAsset,</CodeLine>
              <CodeLine indent={2}>
                activeOrders: openOrders.<CodeToken color="blue">filter</CodeToken>
                (order {'=>'} order.status === <CodeToken color="orange">'ACTIVE'</CodeToken>
                ).length,
              </CodeLine>
              <CodeLine indent={2}>
                <CodeToken color="gray">// ... other relevant overview data</CodeToken>
              </CodeLine>
              <CodeLine indent={1}>{'}'};</CodeLine>
              <CodeLine>{'}'}</CodeLine>
            </CodeBlock>

            {/* Backend Example */}
            <CodeBlock title="PortfolioGateway.js">
              <CodeLine>
                <CodeToken color="blue">import</CodeToken>{' '}
                <CodeToken color="white">
                  {'{ useUpstreamMarketData, useOrderSystemEvents }'}
                </CodeToken>{' '}
                <CodeToken color="blue">from</CodeToken>{' '}
                <CodeToken color="orange">'@reactive-kit/internal-data-hooks'</CodeToken>;
              </CodeLine>
              <CodeLine>
                <CodeToken color="blue">import</CodeToken>{' '}
                <CodeToken color="white">
                  {'{ transformMarketData, correlateWithOrders }'}
                </CodeToken>{' '}
                <CodeToken color="blue">from</CodeToken>{' '}
                <CodeToken color="orange">'./data-processors'</CodeToken>;
              </CodeLine>
              <div className="h-2"></div>
              <CodeLine>
                <CodeToken color="blue">async function</CodeToken>{' '}
                <CodeToken color="yellow">PortfolioWidgetStream</CodeToken>() {'{'}
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="purple">const</CodeToken> rawMarketData ={' '}
                <CodeToken color="purple">await</CodeToken>{' '}
                <CodeToken color="green">useUpstreamMarketData</CodeToken>();
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="purple">const</CodeToken> orderEvents ={' '}
                <CodeToken color="purple">await</CodeToken>{' '}
                <CodeToken color="green">useOrderSystemEvents</CodeToken>();
              </CodeLine>
              <div className="h-2"></div>
              <CodeLine indent={1}>
                <CodeToken color="purple">const</CodeToken> processedMarketData ={' '}
                <CodeToken color="blue">transformMarketData</CodeToken>(rawMarketData);
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="purple">const</CodeToken> livePortfolioView ={' '}
                <CodeToken color="blue">correlateWithOrders</CodeToken>(processedMarketData,
                orderEvents);
              </CodeLine>
              <div className="h-2"></div>
              <CodeLine indent={1}>
                <CodeToken color="purple">return</CodeToken> livePortfolioView;{' '}
                <CodeToken color="gray">
                  // This stream directly feeds the PortfolioOverview widget
                </CodeToken>
              </CodeLine>
              <CodeLine>{'}'}</CodeLine>
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}
