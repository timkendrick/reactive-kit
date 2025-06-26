import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CaseStudySection(): ReactNode {
  const components = [
    {
      title: '📊 Portfolio Overview Widget',
      description: 'Reactive Component providing live, consolidated view of market exposure',
    },
    {
      title: '🌊 Backend Streaming Gateway',
      description: 'Processes and unifies multiple data feeds into clean real-time streams',
    },
    {
      title: '⚙️ Automated Order Execution',
      description: 'Scripted Worker handling complete trade lifecycle with full auditability',
    },
  ];

  return (
    <section className="bg-primary text-primary-foreground py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Case Study: Building a Financial Platform with ReactiveKit
          </h2>
          <p className="text-xl opacity-90">
            See how ReactiveKit helps build powerful distributed systems, integrating with your
            existing infrastructure
          </p>
        </div>

        <Card className="backdrop-blur mb-8">
          <CardHeader className="items-center p-8 pb-4">
            <div className="bg-muted h-64 w-full rounded-lg flex items-center justify-center mb-4">
              <span className="text-muted-foreground text-lg">
                🏗️ Financial Platform Architecture
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 text-center">
            <p className="text-sm text-muted-foreground opacity-75">
              System architecture overview illustrating the interactions between portfolio widgets,
              streaming gateways, and order execution workers
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {components.map((component) => (
            <Card key={component.title} className="backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{component.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-card-foreground opacity-90">{component.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
