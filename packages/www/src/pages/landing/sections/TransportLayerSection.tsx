import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TransportLayerSection(): ReactNode {
  const features = [
    {
      title: '🎯 Guaranteed Determinism',
      description: 'Perfectly reproducible behavior for a given sequence of external inputs',
    },
    {
      title: '📊 Causal Event Log',
      description:
        'Every message, interaction, and state change forms an ordered, traceable history',
    },
    {
      title: '🔍 Precision Debugging',
      description: 'Trace exact event sequences to diagnose issues or verify behavior',
    },
    {
      title: '🎬 Built-in Record/Replay',
      description:
        'The event log enables recording and replaying system interactions for in-depth debugging, regression testing, or scenario analysis',
    },
    {
      title: '👁️ Distributed Observability',
      description:
        'Gain insights into how different components of your distributed ReactiveKit system interact, even across service boundaries.',
    },
  ];

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-2">🌐 Intelligent Transport Layer</h2>
        <p className="text-muted-foreground mb-6">Deterministic, observable system backbone</p>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <p className="text-lg text-subtitle mb-6">
              All ReactiveKit interactions and data pass through a central event bus, producing an{' '}
              <strong>ordered event log</strong> with full causal traceability.
            </p>
            <p className="text-md text-muted-foreground mb-6">
              ReactiveKit's transport layer correlates the event logs from distributed ReactiveKit
              instances, providing a unified view of system-wide operations even when services span
              different processes or machines.
            </p>
            <p className="text-md text-muted-foreground mb-12">
              This transport layer can be easily extended with middleware to provide complex
              logging, observability, recording, and more. This leads to a truly deterministic,
              observable, and debuggable system.
            </p>

            {/* Transport Layer Diagram */}
            <div className="mb-8">
              <div className="relative">
                <div
                  className="grid gap-x-2 items-stretch"
                  style={{
                    gridTemplateColumns: '1fr 1fr auto 0.125rem 1fr 0.125rem auto 1fr',
                  }}
                >
                  {/* Column Headers */}
                  <div className="col-start-1 col-span-2 row-start-1 text-center mb-4">
                    <h4 className="font-semibold text-sm whitespace-nowrap">
                      ⚡ Reactive Components
                    </h4>
                  </div>
                  <div className="col-start-5 row-start-1 text-center mb-4">
                    <h4 className="font-semibold text-sm whitespace-nowrap">
                      🌐 Event Bus Messages
                    </h4>
                  </div>
                  <div className="col-start-8 row-start-1 text-center mb-4">
                    <h4 className="font-semibold text-sm whitespace-nowrap">🔄 Scripted Workers</h4>
                  </div>
                  <div className="col-start-10 row-start-1 text-center mb-4">
                    <h4 className="font-semibold text-sm whitespace-nowrap">🔮 Side Effects</h4>
                  </div>

                  {/* Portfolio Widget */}
                  <div className="col-start-1 row-start-2 row-span-9 flex items-center justify-center p-1">
                    <div className="bg-event-bus-diagram-reactive-component-background border-l border-r border-event-bus-diagram-reactive-component-border border-t border-b border-t-dashed border-b-dashed border-t-event-bus-diagram-reactive-component-border-light border-b-event-bus-diagram-reactive-component-border-light p-3 text-center w-full h-full flex flex-col justify-center">
                      <div className="overflow-hidden text-ellipsis text-event-bus-diagram-reactive-component-foreground font-semibold text-xs">
                        ⚡ Portfolio Widget
                      </div>
                    </div>
                  </div>

                  {/* Alert Dashboard */}
                  <div className="col-start-2 row-start-9 row-span-1 flex items-center justify-center p-1">
                    <div className="bg-event-bus-diagram-reactive-component-background border-l border-r border-event-bus-diagram-reactive-component-border border-t border-b border-t-dashed border-b-dashed border-t-event-bus-diagram-reactive-component-border-light border-b-event-bus-diagram-reactive-component-border-light p-2 text-center w-full">
                      <div className="overflow-hidden text-ellipsis text-event-bus-diagram-reactive-component-foreground font-semibold text-xs">
                        ⚡ Alert Dashboard
                      </div>
                    </div>
                  </div>

                  {/* Event Bus Messages */}
                  {[
                    'UPDATE_PORTFOLIO',
                    'INPUT_VALIDATED',
                    'EXECUTE_ORDER',
                    'ORDER_EXECUTED',
                    'FETCH_REQUEST',
                    'FETCH_RESPONSE',
                    'RISK_ALERT',
                    'ORDER_PLACED',
                    'PORTFOLIO_UPDATED',
                  ].map((message, index) => (
                    <div
                      key={message}
                      className={`col-start-5 row-start-${index + 2} bg-event-bus-diagram-event-bus-message-background border border-event-bus-diagram-event-bus-message-border rounded px-3 py-2 mb-1 w-full text-center`}
                    >
                      <div className="text-event-bus-diagram-event-bus-message-foreground overflow-hidden text-ellipsis whitespace-nowrap font-medium text-xs">
                        ⏺ {message}
                      </div>
                    </div>
                  ))}

                  {/* Scripted Workers */}
                  <div className="col-start-8 row-start-2 row-span-2 flex items-center justify-center p-1">
                    <div className="bg-event-bus-diagram-scripted-worker-background border border-event-bus-diagram-scripted-worker-border rounded-lg p-3 text-center w-full h-full flex flex-col justify-center">
                      <div className="overflow-hidden text-ellipsis text-event-bus-diagram-scripted-worker-foreground font-semibold text-xs">
                        🔄 Input validation
                      </div>
                    </div>
                  </div>
                  <div className="col-start-8 row-start-4 row-span-2 flex items-center justify-center p-1">
                    <div className="bg-event-bus-diagram-scripted-worker-background border border-event-bus-diagram-scripted-worker-border rounded-lg p-3 text-center w-full h-full flex flex-col justify-center">
                      <div className="overflow-hidden text-ellipsis text-event-bus-diagram-scripted-worker-foreground font-semibold text-xs">
                        🔄 Order Executor
                      </div>
                    </div>
                  </div>
                  <div className="col-start-8 row-start-8 row-span-1 flex items-center justify-center p-1">
                    <div className="bg-event-bus-diagram-scripted-worker-background border border-event-bus-diagram-scripted-worker-border rounded-lg p-3 text-center w-full">
                      <div className="overflow-hidden text-ellipsis text-event-bus-diagram-scripted-worker-foreground font-semibold text-xs">
                        🔄 Send notification
                      </div>
                    </div>
                  </div>

                  {/* Side Effects */}
                  <div className="col-start-10 row-start-6 row-span-2 flex items-center justify-center p-1">
                    <div className="bg-event-bus-diagram-side-effect-background border border-event-bus-diagram-side-effect-border rounded-lg p-3 text-center w-full h-full flex flex-col justify-center">
                      <div className="overflow-hidden text-ellipsis text-event-bus-diagram-side-effect-foreground font-semibold text-xs">
                        🔮 Exchange API
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <aside className="border-l border-border pl-4 pb-2 mb-8 lg:sticky lg:top-8">
              <h3 className="text-lg text-foreground font-bold mb-2">
                What's happening under the hood?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                All actions are recorded as serialized messages, forming a replayable log.
                Asynchronous actions that involve external systems are recorded as{' '}
                <strong>side-effects</strong>.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                The event log tracks the point when a side-effect is triggered, and records any
                incoming results produced by the side-effect. This allows middleware to simulate the
                side-effect during debugging or replay sessions, accurately reproducing the original
                behavior.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Each service within a distributed ReactiveKit system maintains its own{' '}
                <strong>local event log</strong>. All interactions with other services are recorded
                in the event logs of both services, allowing actions to be traced across services.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                This means that while there can be no universal event log for the distributed system
                as a whole, the event log of a particular service can be chosen as a frame of
                reference for debugging and testing, ensuring a consistent view of events.
              </p>
              <p className="text-sm text-muted-foreground">
                When debugging interactions between services, the event logs of both services are
                automatically correlated, allowing the causal history of an action to be traced
                across service boundaries.
              </p>
            </aside>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-accent">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-card-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
