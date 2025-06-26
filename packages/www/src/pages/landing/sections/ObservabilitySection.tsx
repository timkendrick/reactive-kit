import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ObservabilitySection(): ReactNode {
  return (
    <section className="bg-muted py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Build systems that
              <br />
              <span className="text-primary">explain themselves</span>
            </h2>
            <h3 className="text-2xl text-subtitle mb-4">
              ReactiveKit generates a <b>complete causal history</b> of every action.
            </h3>
            <p className="text-md text-muted-foreground mb-8">
              Understand precisely why your system is in its current state, with every change
              automatically traced and linked.
            </p>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mt-1">
                  <span className="text-accent-foreground text-xs">1</span>
                </div>
                <div>
                  <div className="font-medium text-accent-foreground">Write declarative logic</div>
                  <div className="text-muted-foreground text-sm">
                    Define what should happen, not how
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mt-1">
                  <span className="text-accent-foreground text-xs">2</span>
                </div>
                <div>
                  <div className="font-medium text-accent-foreground">
                    Get automatic traceability
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Every state change is causally linked
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mt-1">
                  <span className="text-accent-foreground text-xs">3</span>
                </div>
                <div>
                  <div className="font-medium text-accent-foreground">Debug with precision</div>
                  <div className="text-muted-foreground text-sm">
                    Replay exact conditions, trace root causes
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-semibold">System Event Timeline</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-muted-foreground">Paused</div>
                <div className="w-3 h-3 bg-paused-indicator rounded-full animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3 p-2 bg-event-timeline-info-background rounded">
                  <div className="w-2 h-2 bg-event-timeline-info-foreground rounded-full"></div>
                  <span className="font-mono text-xs text-muted-foreground">14:32:15.102</span>
                  <span className="text-card-foreground">Market data updated: AAPL $147.89</span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-event-timeline-render-background rounded ml-4">
                  <div className="w-2 h-2 bg-event-timeline-render-foreground rounded-full"></div>
                  <span className="font-mono text-xs text-muted-foreground">14:32:15.114</span>
                  <span className="text-card-foreground">Portfolio component recalculated</span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-event-timeline-info-background rounded">
                  <div className="w-2 h-2 bg-event-timeline-info-foreground rounded-full"></div>
                  <span className="font-mono text-xs text-muted-foreground">14:32:15.125</span>
                  <span className="text-card-foreground">Market data updated: AAPL $150.23</span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-event-timeline-alert-background border-2 border-event-timeline-alert-foreground rounded ml-4 shadow-sm">
                  <div className="w-2 h-2 bg-event-timeline-alert-foreground rounded-full"></div>
                  <span className="font-mono text-xs text-muted-foreground">14:32:15.156</span>
                  <span className="text-card-foreground">
                    Alert worker triggered: "High volatility"
                  </span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-event-timeline-notification-background rounded ml-8">
                  <div className="w-2 h-2 bg-event-timeline-notification-foreground rounded-full"></div>
                  <span className="font-mono text-xs text-muted-foreground">14:32:15.167</span>
                  <span className="text-card-foreground">UI notification sent</span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-event-timeline-render-background rounded ml-4">
                  <div className="w-2 h-2 bg-event-timeline-render-foreground rounded-full"></div>
                  <span className="font-mono text-xs text-muted-foreground">14:32:15.145</span>
                  <span className="text-card-foreground">Portfolio component recalculated</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
