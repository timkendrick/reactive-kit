import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

export function ObservabilitySection(): ReactNode {
  return (
    <section className="py-16 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } },
          }}
          viewport={{ once: true, margin: '-280px 0px' }}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          <div>
            <h2 className="text-4xl tracking-tight font-bold mb-6">
              Build systems that
              <br />
              <span className="text-primary">explain themselves</span>
            </h2>
            <h3 className="text-2xl text-subtitle font-medium tracking-tight leading-tight mb-4">
              ReactiveKit generates a <b>complete causal history</b> of every action.
            </h3>
            <p className="text-md text-muted-foreground mb-8">
              Understand precisely why your system is in its current state, with every change
              automatically traced and linked.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: 'Write declarative logic',
                  description: 'Define what should happen, not how',
                },
                {
                  title: 'Get automatic traceability',
                  description: 'Every state change is causally linked',
                },
                {
                  title: 'Debug with precision',
                  description: 'Replay exact conditions and trace root causes',
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeOut',
                  }}
                  className="flex items-start space-x-3"
                >
                  <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mt-1">
                    <span className="text-accent-foreground text-xs">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-accent-foreground">{item.title}</div>
                    <div className="text-muted-foreground text-sm">{item.description}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-semibold">System Event Timeline</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-muted-foreground">Paused</div>
                  <div className="w-3 h-3 bg-paused-indicator rounded-full animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
                  }}
                  className="space-y-2 md:space-y-3 text-xs md:text-sm"
                >
                  {[
                    {
                      type: 'info',
                      time: '14:32:15.102',
                      message: 'Market data updated: AAPL $147.82',
                      indent: 0,
                    },
                    {
                      type: 'render',
                      time: '14:32:15.114',
                      message: 'Portfolio component recalculated',
                      indent: 1,
                    },
                    {
                      type: 'info',
                      time: '14:32:15.125',
                      message: 'Market data updated: AAPL $150.23',
                      indent: 0,
                    },
                    {
                      type: 'alert',
                      time: '14:32:15.156',
                      message: 'Alert worker triggered: "High volatility"',
                      indent: 1,
                    },
                    {
                      type: 'notification',
                      time: '14:32:15.167',
                      message: 'UI notification sent',
                      indent: 2,
                    },
                    {
                      type: 'render',
                      time: '14:32:15.145',
                      message: 'Portfolio component recalculated',
                      indent: 1,
                    },
                  ].map((event, index) => (
                    <motion.div
                      key={index}
                      variants={{
                        hidden: { opacity: 0, x: 20 },
                        visible: { opacity: 1, x: 0 },
                      }}
                      transition={{
                        duration: 0.4,
                        ease: 'easeOut',
                      }}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded',
                        event.indent > 0 && `ml-${event.indent * 4}`,
                        event.type === 'info' && 'bg-event-timeline-info-background',
                        event.type === 'render' && 'bg-event-timeline-render-background',
                        event.type === 'alert' && 'bg-event-timeline-alert-background',
                        event.type === 'notification' &&
                          'bg-event-timeline-notification-background',
                        event.type === 'alert' &&
                          'border-2 border-event-timeline-alert-foreground shadow-sm',
                      )}
                    >
                      <div
                        className={cn(
                          'flex-none w-2 h-2 rounded-full',
                          event.type === 'info' && 'bg-event-timeline-info-foreground',
                          event.type === 'render' && 'bg-event-timeline-render-foreground',
                          event.type === 'alert' && 'bg-event-timeline-alert-foreground',
                          event.type === 'notification' &&
                            'bg-event-timeline-notification-foreground',
                        )}
                      />
                      <motion.span
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1 },
                        }}
                        transition={{
                          duration: 0.3,
                          ease: 'easeOut',
                        }}
                        className="font-mono text-xs text-muted-foreground"
                      >
                        {event.time}
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
                        className="text-card-foreground"
                      >
                        {event.message}
                      </motion.span>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
