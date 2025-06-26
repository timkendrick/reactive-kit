import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GetStartedSection(): ReactNode {
  const ctas = [
    {
      emoji: '⭐',
      title: 'Star on GitHub',
      description: 'Get the code, explore the architecture, and contribute!',
      buttonText: 'View on GitHub',
      buttonVariant: 'secondary',
    },
    {
      emoji: '💻',
      title: 'Explore Examples',
      description: 'Dive into source code examples and see ReactiveKit in action',
      buttonText: 'Browse Examples',
      buttonVariant: 'default',
    },
    {
      emoji: '📚',
      title: 'Read the Docs',
      description: 'Deep dive into concepts, APIs, and comprehensive guides',
      buttonText: 'Read Documentation',
      buttonVariant: 'default',
    },
  ];

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-8">Get Started</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          {ctas.map((cta) => (
            <Card key={cta.title} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="text-4xl mb-4">{cta.emoji}</div>
                <CardTitle className="text-xl font-semibold">{cta.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <p className="text-muted-foreground mb-6">{cta.description}</p>
                <Button variant={cta.buttonVariant as any} size="lg">
                  {cta.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </footer>
  );
}
