import { Construction, PackageCheck, PlusIcon, TestTubeDiagonal } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { DotPattern } from '@/components/magicui/dot-pattern';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PluginSection(): ReactNode {
  const pluginCategories = [
    {
      title: 'Available now',
      description: 'Key building blocks for kicking the tires',
      icon: <PackageCheck className="w-6 h-6" />,
      features: [
        { description: 'ReactiveKit core bundle' },
        { description: 'HTTP Fetch' },
        { description: 'State management utilities' },
        { description: 'Timers (including retry/backoff)' },
        { description: 'Custom extension SDK' },
      ],
    },
    {
      title: 'Next milestone',
      description: 'All-in-one app development toolkit',
      icon: <TestTubeDiagonal className="w-6 h-6" />,
      features: [
        { description: 'File System utilities' },
        { description: 'WebSocket transport' },
        { description: 'SSE transport' },
        { description: 'GraphQL (Client & Server)' },
        { description: 'gRPC (Client & Server)' },
        { description: 'Event log CLI' },
      ],
    },
    {
      title: 'Future integrations',
      description: 'Integrate with your wider infrastructure',
      icon: <Construction className="w-6 h-6" />,
      features: [
        { description: 'SQL (Postgres, MySQL)' },
        { description: 'NoSQL (MongoDB, Redis)' },
        { description: 'NATS transport' },
        { description: 'Kafka transport' },
        { description: 'Kubernetes orchestration' },
      ],
    },
  ];

  return (
    <section className="py-16 relative inset-shadow-sm border-t border-border/50">
      <DotPattern className="mask-linear-245 mask-linear-to-50% mask-linear-from-black/50 mask-linear-to-black/20" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl tracking-tight font-bold mb-4 lg:text-4xl">Batteries included</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            ReactiveKit is built upon a <strong>highly pluggable architecture</strong>,
            <br />
            allowing you to extend its capabilities or integrate with your existing stack.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          {pluginCategories.map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-280px 0px' }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.25 }}
              className="flex"
            >
              <Card className="flex-1 flex flex-col text-center bg-white">
                <CardHeader className="pb-3">
                  <div className="flex justify-center mb-2">{category.icon}</div>
                  <CardTitle className="text-xl font-semibold">{category.title}</CardTitle>
                  <CardDescription className="pt-1">{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow justify-start py-4 border-t border-border/50">
                  <ul className="mt-3 space-y-3 px-2">
                    {category.features.map((highlight, index) => (
                      <li
                        key={index}
                        className="group flex items-start gap-4 text-sm/6 text-gray-600 data-disabled:text-gray-400"
                      >
                        <span className="inline-flex h-6 items-center">
                          <PlusIcon
                            aria-hidden="true"
                            className="size-4 fill-gray-400 group-data-disabled:fill-gray-300"
                          />
                        </span>
                        {highlight.description}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mb-12">
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
            Leverage a growing library of official plugins, or even write your own.
          </p>
        </div>
      </div>
    </section>
  );
}
