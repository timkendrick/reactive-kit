import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { Terminal, TerminalLine } from '@/components/Terminal';

export function DebuggingSection(): ReactNode {
  return (
    <section className="py-16 border-t border-border/50">
      <motion.div
        initial="hidden"
        whileInView="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.25 } },
        }}
        viewport={{ once: true, margin: '-280px 0px' }}
        className="max-w-6xl mx-auto px-6"
      >
        <div className="mb-12">
          <h2 className="text-4xl tracking-tight font-bold mb-4">
            Every message.
            <br />
            Every state change.
            <br />
            <span className="text-primary">Completely deterministic.</span>
          </h2>
          <h3 className="text-2xl text-subtitle font-medium tracking-tight leading-tight mb-4">
            Isolate any bug and trace every decision with <b>perfect reproducibility.</b>
          </h3>
          <p className="text-md text-muted-foreground mb-8">
            Build with confidence, knowing your system&rsquo;s behavior is predictable and
            reproducible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center relative">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
            className="relative overflow-hidden -mr-6 md:static md:overflow-visible md:mr-0"
          >
            <Terminal className="-mr-2 md:mr-0">
              <TerminalLine>
                $ rk-trace --type=message -n 5 --event-id=de0c9df4-eea9-4597-8da7-98cd1caf0673
              </TerminalLine>
              <TraceOutputTerminalLine
                timestamp="14:32:15.091"
                variant="success"
                event="PRICE_UPDATE"
                payload={{ symbol: 'AAPL', price: 147.81 }}
              />
              <TraceOutputTerminalLine
                timestamp="14:32:15.102"
                variant="success"
                event="PRICE_UPDATE"
                payload={{ symbol: 'AAPL', price: 147.82 }}
              />
              <TraceOutputTerminalLine
                timestamp="14:32:15.125"
                variant="success"
                event="PRICE_UPDATE"
                payload={{ symbol: 'AAPL', price: 150.23 }}
              />
              <TraceOutputTerminalLine
                timestamp="14:32:15.156"
                variant="warning"
                event="ALERT_TRIGGERED"
                payload={{ type: 'VOLATILITY', symbol: 'AAPL' }}
              />
              <TraceOutputTerminalLine
                timestamp="14:32:15.178"
                variant="info"
                event="NOTIFY_UI"
                payload={{
                  alert: 'High volatility',
                  strategyId: 'ecd9a69d-48a7-48b7-95e7-7e52da1d7766',
                }}
              />
            </Terminal>
          </motion.div>

          <div>
            <motion.h3
              className="text-2xl tracking-tight font-semibold mb-4 text-foreground"
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{
                duration: 0.5,
                ease: 'easeOut',
              }}
            >
              Debug with surgical precision
            </motion.h3>
            <ul className="space-y-3 text-accent-foreground text-xs md:text-sm lg:text-base tracking-tight">
              {[
                'Replay any system state from any point in time',
                'Trace exact causal chains across distributed components',
                'Test edge cases with perfect reproducibility',
              ].map((text) => (
                <motion.li
                  key={text}
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  transition={{
                    duration: 0.4,
                    ease: 'easeOut',
                  }}
                >
                  <motion.span
                    className="text-positive mr-2"
                    variants={{
                      hidden: { opacity: 0, scale: 0.5 },
                      visible: { opacity: 1, scale: 1 },
                    }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                    }}
                  >
                    ✓
                  </motion.span>
                  <motion.span
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1 },
                    }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                    }}
                  >
                    {text}
                  </motion.span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

interface TraceOutputTerminalLineProps {
  className?: string;
  timestamp: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
  event: string;
  payload: Record<string, unknown>;
}

function TraceOutputTerminalLine(props: TraceOutputTerminalLineProps) {
  const { className, timestamp, variant, event, payload } = props;
  return (
    <TerminalLine className={className}>
      <span className="text-slate-600">{timestamp}</span>{' '}
      <span className={getVariantColor(variant)}>{event}</span>{' '}
      <span className="text-slate-500">{formatTraceOutputPayload(payload)}</span>
    </TerminalLine>
  );
}

function getVariantColor(variant: TraceOutputTerminalLineProps['variant']): string | undefined {
  switch (variant) {
    case 'success':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    case 'info':
      return 'text-cyan-500';
    case 'warning':
      return 'text-yellow-500';
    default:
      return undefined;
  }
}

function formatTraceOutputPayload(payload: Record<string, unknown>): ReactNode {
  return `{ ${Object.entries(payload)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(', ')} }`;
}
