import { Settings, SquareActivity, WandSparkles, Webhook } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

const eventMessages = [
  'UPDATE_PORTFOLIO',
  'INPUT_VALIDATED',
  'EXECUTE_ORDER',
  'ORDER_EXECUTED',
  'FETCH_REQUEST',
  'FETCH_RESPONSE',
  'RISK_ALERT',
  'ORDER_PLACED',
  'PORTFOLIO_UPDATED',
];

const rightPointingArrowLineClass =
  "h-0.5 w-full bg-border relative after:content-[''] after:absolute after:top-1/2 after:-translate-y-1/2 after:left-full after:w-0 after:h-0 after:border-t-[4px] after:border-t-transparent after:border-b-[4px] after:border-b-transparent after:border-l-[6px] after:border-l-border";
const leftPointingArrowLineClass =
  "h-0.5 w-full bg-border relative after:content-[''] after:absolute after:top-1/2 after:-translate-y-1/2 after:right-full after:w-0 after:h-0 after:border-t-[4px] after:border-t-transparent after:border-b-[4px] after:border-b-transparent after:border-r-[6px] after:border-r-border";

const arrowDefinitions = [
  // Refactored: Portfolio Widget to UPDATE_PORTFOLIO
  { colStart: 2, colSpan: 2, rowStart: 2, direction: 'right' },
  // Refactored: UPDATE_PORTFOLIO to Input Validation
  { colStart: 5, rowStart: 2, direction: 'right' },
  // From Input validation (col 6) to INPUT_VALIDATED (col 4) - Arrow in col 5, row 3
  { colStart: 5, rowStart: 3, direction: 'left' },
  // From EXECUTE_ORDER (col 4) to Order Executor (col 6) - Arrow in col 5, row 4
  { colStart: 5, rowStart: 4, direction: 'right' },
  // From Order Executor (col 6) to ORDER_EXECUTED (col 4) - Arrow in col 5, row 5
  { colStart: 5, rowStart: 5, direction: 'left' },
  // From FETCH_REQUEST (col 4) to Exchange API (col 7) - Arrow in col 5, row 6, spans 2 cols
  { colStart: 5, rowStart: 6, colSpan: 2, direction: 'right' },
  // From Exchange API (col 7) to FETCH_RESPONSE (col 4) - Arrow in col 5, row 7, spans 2 cols
  { colStart: 5, rowStart: 7, colSpan: 2, direction: 'left' },
  // From RISK_ALERT (col 4) to Send notification (col 6) - Arrow in col 5, row 8
  { colStart: 5, rowStart: 8, direction: 'right' },
  // From ORDER_PLACED (col 4) to Alert Dashboard (col 2) - Arrow in col 3, row 9
  { colStart: 3, rowStart: 9, direction: 'left' },
  // New: From PORTFOLIO_UPDATED (col 4, row 11) to Portfolio Widget column area (col 1)
  // Arrow is in col-start-2, col-span-2, row-start-11, points left
  { colStart: 2, colSpan: 2, rowStart: eventMessages.length + 1, direction: 'left' },
];

export function TransportLayerSection(): ReactNode {
  return (
    <section className="py-16 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="md:flex md:items-center md:gap-2 xl:relative">
          <Badge
            className="mb-4 md:mb-0 xl:absolute xl:my-4 xl:mr-4 xl:right-full"
            variant="outline"
          >
            Deep-dive
          </Badge>
          <div className="md:flex-none flex gap-2 items-center">
            <Webhook className="w-8 h-8 -mt-1" />
            <h2 className="text-2xl md:text-3xl tracking-tight font-bold mb-2 whitespace-nowrap">
              Intelligent Transport Layer
            </h2>
          </div>
        </div>
        <p className="text-muted-foreground text-sm tracking-tight font-semibold mb-6">
          Deterministic, observable system backbone
        </p>

        <div className="lg:flex lg:flex-row lg:space-x-12">
          <div className="lg:flex-2">
            <div className="mb-12">
              <p className="text-lg text-subtitle mb-6">
                All ReactiveKit interactions and data pass through a central event bus, producing an{' '}
                <strong>ordered event log</strong> with full causal traceability.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                This layer is the fundamental backbone of your ReactiveKit application. More than
                just a record of events, the event bus effectively drives the system: new entries
                automatically trigger actions in Reactive Components and Scripted Workers, ensuring
                a logically consistent reactive system.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                ReactiveKit&rsquo;s transport layer correlates the event logs from distributed
                ReactiveKit instances, providing a unified view of system-wide operations even when
                services span different processes or machines.
              </p>
              <p className="text-md text-muted-foreground mb-6">
                This transport layer can be easily extended with middleware to provide complex
                logging, observability, recording, and more. This leads to a truly deterministic,
                observable, and debuggable system.
              </p>
            </div>

            <div className="select-none mb-8">
              <figure className="flex flex-col">
                <div className="flex-none relative pt-[66.66666666666666%] md:static md:pt-0">
                  <div
                    className="sequence-diagram bg-background p-6 rounded-md grid gap-x-2 gap-y-2 items-start inset-shadow-xs absolute top-0 w-2/1 h-2/1 scale-50 origin-top-left md:static md:top-auto md:w-auto md:h-auto md:scale-100"
                    style={{
                      ...({
                        '--text-xs': '0.625rem',
                        '--text-xs--line-height': 'calc(1 / 0.625)',
                        '--muted': 'var(--color-slate-300)',
                        '--muted-foreground': 'var(--color-slate-500)',
                        '--border': 'var(--color-slate-600)',
                        '--background': 'var(--color-slate-700)',
                        '--foreground': 'var(--color-slate-400)',
                        '--card': 'var(--color-slate-800)',
                        '--card-foreground': 'var(--color-slate-400)',
                      } as CSSProperties),
                      gridTemplateColumns:
                        'minmax(0,1fr) minmax(0,1fr) 1.5rem minmax(0,1.5fr) 1.5rem minmax(0,1.5fr) minmax(0,1fr)',
                    }}
                  >
                    <div className="col-start-1 col-span-2 row-start-1 text-center mb-2">
                      <h4 className="font-semibold text-xs text-foreground flex items-center justify-center space-x-1.5">
                        <SquareActivity className="w-4 h-4 text-muted-foreground stroke-1" />
                        <span>Reactive Components</span>
                      </h4>
                    </div>
                    <div className="col-start-4 row-start-1 text-center mb-2">
                      <h4 className="font-semibold text-xs text-foreground flex items-center justify-center space-x-1.5">
                        <Webhook className="w-4 h-4 text-muted-foreground stroke-1" />
                        <span>Event Bus Messages</span>
                      </h4>
                    </div>
                    <div className="col-start-6 row-start-1 text-center mb-2">
                      <h4 className="font-semibold text-xs text-foreground flex items-center justify-center space-x-1.5">
                        <Settings className="w-4 h-4 text-muted-foreground stroke-1" />
                        <span>Scripted Workers</span>
                      </h4>
                    </div>
                    <div className="col-start-7 row-start-1 text-center mb-2">
                      <h4 className="font-semibold text-xs text-foreground flex items-center justify-center space-x-1.5">
                        <WandSparkles className="w-4 h-4 text-muted-foreground stroke-1" />
                        <span>Side Effects</span>
                      </h4>
                    </div>

                    <div className="col-start-1 row-start-2 row-span-9 flex items-center justify-center h-full">
                      <div className="bg-card text-card-foreground p-2.5 text-center w-full h-full flex flex-col justify-center items-center border border-border rounded-xs shadow-sm space-y-1">
                        <SquareActivity className="w-5 h-5 text-muted-foreground stroke-1" />
                        <div className="text-xs font-medium leading-tight whitespace-nowrap">
                          Portfolio Widget
                        </div>
                      </div>
                    </div>

                    <div className="col-start-2 row-start-9 row-span-1 flex items-center justify-center h-full">
                      <div className="bg-card text-card-foreground p-2.5 text-center w-full h-full flex flex-col justify-center items-center border border-border rounded-xs shadow-sm space-y-1">
                        <SquareActivity className="w-5 h-5 text-muted-foreground stroke-1" />
                        <div className="text-xs font-medium leading-tight whitespace-nowrap">
                          Alert Dashboard
                        </div>
                      </div>
                    </div>

                    {/* Horizontal connecting arrows */}
                    {arrowDefinitions.map((arrow, index) => (
                      <div
                        key={`arrow-${index}`}
                        className={cn(
                          `col-start-${arrow.colStart}`,
                          arrow.colSpan ? `col-span-${arrow.colSpan}` : '',
                          `row-start-${arrow.rowStart}`,
                          'flex items-center h-7',
                        )}
                      >
                        <div
                          className={
                            arrow.direction === 'left'
                              ? leftPointingArrowLineClass
                              : rightPointingArrowLineClass
                          }
                        />
                      </div>
                    ))}

                    {eventMessages.map((message, index) => (
                      <div
                        key={message}
                        className={cn(
                          `col-start-4 rounded-xs w-full relative`,
                          `row-start-${index + 2}`,
                          index < eventMessages.length - 1
                            ? cn(
                                "after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:w-px after:bg-border",
                                index === eventMessages.length - 2
                                  ? 'after:h-[calc(2rem+6px)] after:-bottom-[7px]'
                                  : 'after:h-[6px] after:-bottom-[7px]',
                              )
                            : '',
                          index === eventMessages.length - 2 ? 'pb-8' : '',
                        )}
                      >
                        <div className="w-full px-2.5 py-1.5 bg-card border border-border rounded-xs shadow-sm">
                          <div className="text-card-foreground font-mono text-xs text-center font-medium h-4 overflow-hidden text-ellipsis whitespace-nowrap">
                            {message}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="col-start-6 row-start-2 row-span-2 flex items-stretch justify-center h-full">
                      <div className="bg-card text-card-foreground p-2.5 text-center w-full flex flex-col justify-center items-center border border-border rounded-xs shadow-sm space-y-1">
                        <Settings className="w-5 h-5 text-muted-foreground stroke-1" />
                        <div className="text-xs font-medium leading-tight whitespace-nowrap">
                          Input validation
                        </div>
                      </div>
                    </div>
                    <div className="col-start-6 row-start-4 row-span-2 flex items-stretch justify-center h-full">
                      <div className="bg-card text-card-foreground p-2.5 text-center w-full flex flex-col justify-center items-center border border-border rounded-xs shadow-sm space-y-1">
                        <Settings className="w-5 h-5 text-muted-foreground stroke-1" />
                        <div className="text-xs font-medium leading-tight whitespace-nowrap">
                          Order Executor
                        </div>
                      </div>
                    </div>
                    <div className="col-start-6 row-start-8 row-span-2 flex items-stretch justify-center h-full">
                      <div className="bg-card text-card-foreground p-2.5 text-center w-full flex flex-col justify-center items-center border border-border rounded-xs shadow-sm space-y-1">
                        <Settings className="w-5 h-5 text-muted-foreground stroke-1" />
                        <div className="text-xs font-medium leading-tight whitespace-nowrap">
                          Send notification
                        </div>
                      </div>
                    </div>

                    <div className="col-start-7 row-start-6 row-span-2 flex items-stretch justify-center h-full">
                      <div className="bg-card text-card-foreground p-2.5 text-center w-full flex flex-col justify-center items-center border border-border rounded-xs shadow-sm space-y-1">
                        <WandSparkles className="w-5 h-5 text-muted-foreground stroke-1" />
                        <div className="text-xs font-medium leading-tight whitespace-nowrap">
                          Exchange API
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <figcaption className="flex-none text-xs text-muted-foreground/75 mt-2 border-l-2 border-border pl-2">
                  Sequence diagram showing interactions with the Intelligent Transport Layer event
                  bus within a ReactiveKit system
                </figcaption>
              </figure>
            </div>
          </div>

          <div className="lg:flex-1">
            <aside className="border-l border-border border-dashed pl-4 pb-2 mb-8 lg:sticky lg:top-8">
              <h3 className="text-lg text-foreground font-bold mb-2">
                What&rsquo;s happening under the hood?
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
                When debugging interactions between services, the event logs of both services are
                automatically correlated, allowing the causal history of an action to be traced
                across service boundaries.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                This means that while there is no single universal event log for the distributed
                system as a whole, the event log of a particular service can be chosen as the frame
                of reference when debugging, ensuring a consistent view of events across all
                services.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
