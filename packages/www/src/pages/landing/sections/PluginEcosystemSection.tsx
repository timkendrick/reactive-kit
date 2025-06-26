import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PluginEcosystemSection(): ReactNode {
  const pluginCategories = [
    {
      title: '✅ Available Now',
      plugins: ['ReactiveKit core bundle', 'HTTP Fetch', 'State Management', 'Timers'],
    },
    {
      title: '🚀 Coming Soon',
      plugins: [
        'WebSocket transport',
        'SSE transport',
        'GraphQL (Client & Server)',
        'gRPC (Client & Server)',
      ],
    },
    {
      title: '🔮 Future',
      plugins: [
        'SQL (Postgres, MySQL)',
        'NoSQL (MongoDB, Redis)',
        'NATS transport',
        'Kafka transport',
        'Kubernetes orchestration',
      ],
    },
  ];

  return (
    <section className="bg-muted py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Batteries included</h2>
          <p className="text-xl text-muted-foreground mb-4">
            ReactiveKit is built upon a highly pluggable architecture,
            <br />
            allowing you to extend its capabilities or integrate with your existing stack.
          </p>
          <p className="text-xl text-muted-foreground">
            Leverage a growing library of official plugins, or even write your own.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pluginCategories.map((category) => (
            <Card key={category.title}>
              <CardHeader>
                <CardTitle className="font-semibold">{category.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {category.plugins.map((plugin) => (
                    <li key={plugin}>• {plugin}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
