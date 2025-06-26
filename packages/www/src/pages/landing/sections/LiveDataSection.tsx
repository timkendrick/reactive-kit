import type { ReactNode } from 'react';

import { CodeBlock, CodeLine, CodeToken } from '@/components/CodeBlock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LiveDataSection(): ReactNode {
  return (
    <section className="bg-muted py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-6">
            Always live data,
            <br />
            <span className="text-primary">all the time</span>
          </h2>
          <h3 className="text-2xl text-subtitle mb-4">
            ReactiveKit <b>abstracts away the complexity</b> of subscriptions, callbacks and caches.
          </h3>
          <p className="text-md text-muted-foreground mb-8">
            ReactiveKit's full-stack reactivity primitives make stale data a thing of the past.
            Components throughout your architecture will always reflect the latest live updates,
            automatically and efficiently, with zero effort.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <CodeBlock title="// usePortfolioValue.js">
            <CodeLine>
              <CodeToken color="blue">async function</CodeToken>{' '}
              <CodeToken color="yellow">usePortfolioValue</CodeToken>
              <CodeToken color="white">() {'{'}</CodeToken>
            </CodeLine>
            <CodeLine indent={1}>
              <CodeToken color="purple">const</CodeToken> prices ={' '}
              <CodeToken color="purple">await</CodeToken>{' '}
              <CodeToken color="green">useMarketData</CodeToken>();
            </CodeLine>
            <CodeLine indent={1}>
              <CodeToken color="purple">const</CodeToken> holdings ={' '}
              <CodeToken color="purple">await</CodeToken>{' '}
              <CodeToken color="green">usePortfolio</CodeToken>();
            </CodeLine>
            <CodeLine indent={1}>
              <CodeToken color="purple">return</CodeToken> holdings.
              <CodeToken color="blue">reduce</CodeToken>((total, stock) {'=>'} {'{'}
            </CodeLine>
            <CodeLine indent={2}>
              <CodeToken color="purple">return</CodeToken> total + (prices[stock.symbol] *
              stock.shares);
            </CodeLine>
            <CodeLine indent={1}>
              {'}'}, <CodeToken color="orange">0</CodeToken>);
            </CodeLine>
            <CodeLine>{'}'}</CodeLine>
          </CodeBlock>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Portfolio Value</CardTitle>
              <div className="w-3 h-3 bg-live-indicator rounded-full animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-positive mb-6">$247,892.34</div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>AAPL (100 shares)</span>
                  <span className="text-positive">$15,023.00 ↗</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>MSFT (50 shares)</span>
                  <span className="text-negative">$17,845.50 ↘</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TSLA (25 shares)</span>
                  <span className="text-positive">$6,234.75 ↗</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
