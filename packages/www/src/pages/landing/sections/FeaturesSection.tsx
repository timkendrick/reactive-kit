import {
  FlaskConical,
  Hammer,
  ListRestart,
  Microscope,
  Radar,
  ScrollText,
  Sparkles,
  SquareStack,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { FeatureGrid } from '@/components/FeatureGrid';

export interface FeaturesSectionProps {}

export function FeaturesSection(props: FeaturesSectionProps): ReactNode {
  const {} = props;
  return (
    <section className="py-16 border-t border-border/50 border-dashed">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-center text-3xl tracking-tight font-bold mb-8 lg:text-4xl">
          Why Choose ReactiveKit?
        </h2>
        <FeatureGrid
          itemsPerRow={4}
          features={[
            {
              icon: <Sparkles />,
              title: 'Simplified Development',
              description: (
                <>
                  Focus on building, not plumbing.
                  <br />
                  <br />
                  Drastically reduce boilerplate for state synchronization, concurrency, and async
                  logic.
                </>
              ),
            },
            {
              icon: <Hammer />,
              title: 'Inherently Robust',
              description: (
                <>
                  Built for reliability from the ground up.
                  <br />
                  <br />
                  Fully reactive dataflow guarantees consistent behavior across your system, making
                  sure it never falls out of sync.
                </>
              ),
            },
            {
              icon: <SquareStack />,
              title: 'Deterministic by Design',
              description: (
                <>
                  Perfectly reproducible behavior for a given sequence of external inputs.
                  <br />
                  <br />
                  Build real-time systems you can trust to behave predictably and reproducibly.
                </>
              ),
            },
            {
              icon: <ScrollText />,
              title: 'Causal Event Log',
              description: (
                <>
                  Every message, interaction, and state change forms an ordered, traceable history.
                  <br />
                  <br />
                  Replay any event sequence to verify behavior or diagnose issues.
                </>
              ),
            },
            {
              icon: <FlaskConical />,
              title: 'Radically Testable',
              description: (
                <>
                  Architected for testing at every level.
                  <br />
                  <br />
                  ReactiveKit test utilities make it easy to write comprehensive tests with
                  confidence, from individual units to complex interactions.
                </>
              ),
            },
            {
              icon: <Microscope />,
              title: 'Precision Debugging',
              description: (
                <>
                  Trace exact event sequences to diagnose issues or verify behavior.
                  <br />
                  <br />
                  Untangle complex edge cases with an unprecedented view into your system&rsquo;s
                  causal history.
                </>
              ),
            },
            {
              icon: <ListRestart />,
              title: 'Built-in Record/Replay',
              description: (
                <>
                  Never miss an edge case.
                  <br />
                  <br />
                  The event log enables recording and replaying system interactions for in-depth
                  debugging, regression testing, or scenario analysis.
                </>
              ),
            },
            {
              icon: <Radar />,
              title: 'Distributed Observability',
              description: (
                <>
                  Visualize your entire system.
                  <br />
                  <br />
                  Gain insights into how different components of your distributed ReactiveKit system
                  interact, even across service boundaries.
                </>
              ),
            },
          ].map((feature) => ({
            icon: feature.icon,
            title: feature.title,
            description: feature.description,
          }))}
        />
      </div>
    </section>
  );
}
