import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DeveloperExperienceSection(): ReactNode {
  const tools = [
    {
      title: '🔍 Visual Debugger',
      mockups: [
        {
          placeholder: '⏱️ Time-travel debugging interface',
          caption:
            'Mockup 1: Time-travel debugging interface, showing a timeline of events. A slider allows dragging back and forth, with the application state updating to reflect the selected point in time. Event details are shown for a selected event.',
        },
        {
          placeholder: '🕸️ Message flow visualization',
          caption:
            'Mockup 2: A graph visualizing message flows between different Reactive Components and Scripted Workers. Lines connect components, indicating messages, and perhaps dependencies are highlighted.',
        },
      ],
    },
    {
      title: '📊 Performance & Observability',
      mockups: [
        {
          placeholder: '📈 Performance dashboard',
          caption:
            'Mockup 3: A dashboard UI displaying performance metrics. Charts show component/worker execution times, message latencies, and potential system bottlenecks are flagged.',
        },
        {
          placeholder: '🔗 OpenTelemetry integration',
          caption:
            'Mockup 4: A settings screen or code snippet showing easy integration with OpenTelemetry. Another panel shows a conceptual view of how ReactiveKit data might appear in a Prometheus/Grafana dashboard, or an advanced error tracking service dashboard.',
        },
      ],
    },
  ];

  return (
    <section className="bg-muted py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Coming soon: ReactiveKit Observability Suite</h2>
          <p className="text-xl text-muted-foreground">
            We&rsquo;re committed to an unparalleled developer experience. Our upcoming suite of
            observability and debugging tools will provide deep insight and control over your
            ReactiveKit applications.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {tools.map((tool) => (
            <Card key={tool.title}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {tool.mockups.map((mockup) => (
                  <Card key={mockup.placeholder} className="overflow-hidden">
                    <CardContent className="p-0">
                      <figure>
                        <div className="bg-accent h-32 rounded-t-lg flex items-center justify-center">
                          <span className="text-accent-foreground">{mockup.placeholder}</span>
                        </div>
                        <figcaption className="text-xs text-card-foreground p-3 pt-2 bg-card rounded-b-lg">
                          {mockup.caption}
                        </figcaption>
                      </figure>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
