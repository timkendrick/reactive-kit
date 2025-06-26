import { Settings, SquareActivity, Webhook } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { DotPattern } from '@/components/magicui/dot-pattern';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

export function ParadigmSection(): ReactNode {
  const buildingBlocks = [
    {
      colspan: 1,
      icon: <SquareActivity className="w-8 h-8" />,
      title: 'Reactive Components',
      description: (
        <>
          Define complex live computations
          <br />
          anywhere on your stack
        </>
      ),
      illustration: (
        <ReactiveComponentsIllustration
          className="text-muted-foreground"
          color="currentColor"
          highlightColor="var(--primary)"
        />
      ),
      featuresTitle: 'Use cases:',
      features: [
        'Dynamic front-end UI widgets',
        'Back-end streaming API endpoints',
        'Real-time dashboards',
      ],
    },
    {
      colspan: 1,
      icon: <Settings className="w-8 h-8" />,
      title: 'Scripted Workers',
      description: (
        <>
          Stateful, repeatable
          <br />
          process orchestration
        </>
      ),
      illustration: (
        <ScriptedWorkersIllustration
          className="text-muted-foreground"
          color="currentColor"
          highlightColor="var(--primary)"
        />
      ),
      featuresTitle: 'Use cases:',
      features: [
        'Complex client-side form validation',
        'Data processing pipelines',
        'Alerting mechanisms',
      ],
    },
    {
      colspan: 2,
      icon: <Webhook className="w-8 h-8" />,
      title: 'Intelligent Transport Layer',
      description: (
        <>
          Deterministic, observable
          <br />
          system backbone
        </>
      ),
      illustration: (
        <TransportLayerIllustration
          className="text-muted-foreground"
          color="currentColor"
          highlightColor="var(--primary)"
        />
      ),
      featuresTitle: 'Key features:',
      features: [
        'Ordered event bus synchronizes all interactions',
        'All application communication flows through this layer',
        'Single source of truth for deterministic system behavior',
      ],
    },
  ];

  return (
    <section className="py-16 relative inset-shadow-sm border-t border-border/50">
      <DotPattern className="mask-linear-245 mask-linear-to-50% mask-linear-from-black/50 mask-linear-to-black/20" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl tracking-tight font-bold mb-6">
            A New Paradigm for Real-Time Systems
          </h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            <strong>ReactiveKit</strong> offers a unified and simplified approach by combining three
            powerful building blocks.
          </p>
        </div>

        <div className="md:w-2/3 mx-auto mb-12">
          <div className="grid gap-4 mb-4 md:grid-cols-2">
            {buildingBlocks.map((block, index) => (
              <motion.div
                key={block.title}
                className={cn('flex', block.colspan === 2 ? 'md:col-span-2' : null)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-280px 0px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: index % 2 === 1 ? 0.5 : 0 }}
              >
                <Card className="flex-1 flex flex-col text-center bg-white">
                  <CardHeader className="px-3 lg:px-4">
                    <div className="flex justify-center lg:mb-2">{block.icon}</div>
                    <CardTitle className="text-lg md:text-xl font-semibold">
                      {block.title}
                    </CardTitle>
                    <CardDescription className="pt-1">
                      <div className="flex flex-col">
                        <div className="flex-none pb-4">{block.description}</div>
                        <div className="flex-none flex justify-center align-middle h-16 overflow-hidden">
                          {block.illustration}
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow justify-start py-4 border-t border-border/50">
                    <div className="text-left">
                      <h4 className="text-xs md:text-sm font-medium text-subtitle mb-2">
                        {block.featuresTitle}
                      </h4>
                      <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                        {block.features.map((feature, index) => (
                          <li key={index} className="mb-2 md:mb-1">
                            • {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="text-center mb-8 md:mb-12">
          <p className="text-md lg:text-xl text-muted-foreground max-w-4xl mx-auto">
            The combination of these three building blocks ensures that your system is always in
            sync,
            <br />
            allowing you to focus on building your application with confidence.
          </p>
        </div>
      </div>
    </section>
  );
}

interface ReactiveComponentsIllustrationProps {
  className?: string;
  color: string;
  highlightColor: string;
}

function ReactiveComponentsIllustration(props: ReactiveComponentsIllustrationProps): ReactNode {
  const { className, color, highlightColor } = props;
  return (
    <svg width="74" height="53" viewBox="0 0 74 53" className={className}>
      {/* Top level: Multiple data sources */}
      <rect x="5" y="5" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="28" y="5" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="51" y="5" width="18" height="12" rx="2" fill={color} opacity="0.5" />

      {/* Arrows pointing down and converging */}
      <path
        d="M14 20 L14 24 Q14 26 16 26 L23 26 Q25 26 25 28 L25 34 M22 31 L25 34 L28 31"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M37 20 L37 34 M34 31 L37 34 L40 31"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M60 20 L60 24 Q60 26 58 26 L51 26 Q49 26 49 28 L49 34 M46 31 L49 34 L52 31"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Bottom level: Single computed result (highlighted) */}
      <rect x="19" y="36" width="36" height="12" rx="3" fill={highlightColor} opacity="0.8" />
    </svg>
  );
}

interface ScriptedWorkersIllustrationProps {
  className?: string;
  color: string;
  highlightColor: string;
}

function ScriptedWorkersIllustration(props: ScriptedWorkersIllustrationProps): ReactNode {
  const { className, color, highlightColor } = props;
  return (
    <svg width="120" height="50" viewBox="0 0 120 50" className={className}>
      {/* Sequential chain of blocks */}
      <rect x="5" y="17" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="35" y="17" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="65" y="17" width="18" height="12" rx="2" fill={highlightColor} opacity="0.8" />
      <rect x="95" y="17" width="18" height="12" rx="2" fill={color} opacity="0.5" />

      {/* Right-pointing arrows */}
      <path
        d="M26 23 L32 23 M29 20 L32 23 L29 26"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M56 23 L62 23 M59 20 L62 23 L59 26"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M86 23 L92 23 M89 20 L92 23 L89 26"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

interface TransportLayerIllustrationProps {
  className?: string;
  color: string;
  highlightColor: string;
}

function TransportLayerIllustration(props: TransportLayerIllustrationProps): ReactNode {
  const { className, color, highlightColor } = props;
  return (
    <svg width="102" height="65" viewBox="0 0 102 65" className={className}>
      {/* Top row components (3 blocks) - aligned with central pipeline blocks 1, 3, and 5 */}
      <rect x="12" y="5" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="42" y="5" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="72" y="5" width="18" height="12" rx="2" fill={color} opacity="0.5" />

      {/* Bottom row components (2 blocks) - aligned with central pipeline blocks 2 and 4 */}
      <rect x="27" y="48" width="18" height="12" rx="2" fill={color} opacity="0.5" />
      <rect x="57" y="48" width="18" height="12" rx="2" fill={color} opacity="0.5" />

      {/* Central Pipeline blocks (14px each with 1px spacing, horizontally centered) */}
      <rect x="14" y="27" width="14" height="12" rx="1" fill={highlightColor} opacity="0.25" />
      <rect x="29" y="27" width="14" height="12" rx="1" fill={highlightColor} opacity="0.3" />
      <rect x="44" y="27" width="14" height="12" rx="1" fill={highlightColor} opacity="0.4" />
      <rect x="59" y="27" width="14" height="12" rx="1" fill={highlightColor} opacity="0.5" />
      <rect x="74" y="27" width="14" height="12" rx="1" fill={highlightColor} opacity="1.0" />

      {/* Arrows from top */}
      <path
        d="M21 17 L21 25 M18 22 L21 25 L24 22"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M51 17 L51 25 M48 22 L51 25 L54 22"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M81 17 L81 25 M78 22 L81 25 L84 22"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Arrows from bottom */}
      <path
        d="M36 48 L36 41 M33 44 L36 41 L39 44"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M66 48 L66 41 M63 44 L66 41 L69 44"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
