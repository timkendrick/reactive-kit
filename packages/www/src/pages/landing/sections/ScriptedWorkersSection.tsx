import type { ReactNode } from 'react';

import { CodeBlock, CodeLine, CodeToken } from '@/components/CodeBlock';

export function ScriptedWorkersSection(): ReactNode {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">🔄 Scripted Workers</h2>
            <p className="text-gray-400 mb-6">Stateful, repeatable process orchestration</p>
            <p className="text-lg text-gray-600 mb-6">
              Scripted Workers are composable runners for{' '}
              <strong>deterministic procedural workflows</strong>, suitable for both short-lived
              one-off tasks and long-running event-driven services.
            </p>
            <p className="text-md text-gray-600 mb-6">
              Define their behavior as a clear, logic-driven sequence of operations, managing
              internal state and communicating via messages for reliable process automation.
            </p>
            <p className="text-md text-gray-600 mb-6">
              Determinism is enforced by operating solely on input messages and internal state, with
              all side effects mediated via the Intelligent Transport Layer to ensure perfect
              replayability.
            </p>

            <div className="text-sm space-y-4">
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>
                  <strong>Declarative & Composable</strong>
                  <br />
                  The intuitive declarative API and powerful combinators make it simple to build up
                  clear, testable, and maintainable logic.
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>
                  <strong>Deterministic Stateful Logic</strong>
                  <br />
                  Similar to state machines or actors, define synchronous and asynchronous workflows
                  step-by-step, ensuring predictable, testable behavior and state transitions.
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>
                  <strong>Message-Driven Communication</strong>
                  <br />
                  Interact with Reactive Components or other Scripted Workers via a simple
                  message-passing API that integrates deeply with ReactiveKit's intelligent
                  transport layer to communicate with the rest of the system.
                </span>
              </div>
            </div>
          </div>

          <div>
            <CodeBlock title="OrderExecutionWorker.js">
              <CodeLine>
                <CodeToken color="blue">import</CodeToken>{' '}
                <CodeToken color="white">
                  {'{ act, sequence, waitFor, send, modifyState, readState }'}
                </CodeToken>{' '}
                <CodeToken color="blue">from</CodeToken>{' '}
                <CodeToken color="orange">'@reactive-kit/scripted-workers'</CodeToken>;
              </CodeLine>
              <CodeLine>
                <CodeToken color="blue">import</CodeToken>{' '}
                <CodeToken color="white">
                  {
                    '{ OrderRequestMsg, ExchangeAPI, PortfolioActor, NotificationService, TradeConfirmationMsg }'
                  }
                </CodeToken>{' '}
                <CodeToken color="blue">from</CodeToken>{' '}
                <CodeToken color="orange">'./trading-interfaces'</CodeToken>;
              </CodeLine>
              <div className="h-2"></div>
              <CodeLine>
                <CodeToken color="blue">const</CodeToken>{' '}
                <CodeToken color="yellow">orderExecutionWorker</CodeToken> ={' '}
                <CodeToken color="green">act</CodeToken>((self, {'{ outbox, complete, fail }'}){' '}
                {'=>'}
              </CodeLine>
              <CodeLine indent={1}>
                <CodeToken color="green">sequence</CodeToken>(() {'=>'} [
              </CodeLine>
              <CodeLine indent={2}>
                <CodeToken color="green">waitFor</CodeToken>(
              </CodeLine>
              <CodeLine indent={3}>
                (msg): msg is OrderRequestMsg {'=>'} msg.type ==={' '}
                <CodeToken color="orange">'ORDER_REQUEST'</CodeToken>,
              </CodeLine>
              <CodeLine indent={3}>
                (orderMsgHandle) {'=>'} <CodeToken color="green">send</CodeToken>(ExchangeAPI,{' '}
                <CodeToken color="green">readState</CodeToken>(orderMsgHandle, (order) {'=>'} ({'{'}{' '}
                type: <CodeToken color="orange">'PLACE_TRADE'</CodeToken>, details: order.payload{' '}
                {'}'})))
              </CodeLine>
              <CodeLine indent={2}>),</CodeLine>
              <CodeLine indent={2}>
                <CodeToken color="green">waitFor</CodeToken>(
              </CodeLine>
              <CodeLine indent={3}>
                (msg): msg is TradeConfirmationMsg {'=>'} msg.type ==={' '}
                <CodeToken color="orange">'TRADE_CONFIRMATION'</CodeToken>,
              </CodeLine>
              <CodeLine indent={3}>
                (confirmMsgHandle) {'=>'} <CodeToken color="green">sequence</CodeToken>(() {'=>'} [
              </CodeLine>
              <CodeLine indent={4}>
                <CodeToken color="gray">
                  // Assuming PortfolioActor is another worker/actor this worker can message
                </CodeToken>
              </CodeLine>
              <CodeLine indent={4}>
                <CodeToken color="green">send</CodeToken>(PortfolioActor,{' '}
                <CodeToken color="green">readState</CodeToken>(confirmMsgHandle, (confirmation){' '}
                {'=>'} ({'{'} type: <CodeToken color="orange">'UPDATE_PORTFOLIO'</CodeToken>, trade:
                confirmation.payload {'}'})),
              </CodeLine>
              <CodeLine indent={4}>
                <CodeToken color="green">send</CodeToken>(NotificationService,{' '}
                <CodeToken color="green">readState</CodeToken>(confirmMsgHandle, (confirmation){' '}
                {'=>'} ({'{'} type: <CodeToken color="orange">'TRADE_COMPLETE'</CodeToken>, details:
                confirmation.payload {'}'})))
              </CodeLine>
              <CodeLine indent={3}>])</CodeLine>
              <CodeLine indent={2}>),</CodeLine>
              <CodeLine indent={2}>
                <CodeToken color="green">complete</CodeToken>()
              </CodeLine>
              <CodeLine indent={1}>])</CodeLine>
              <CodeLine>);</CodeLine>
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}
