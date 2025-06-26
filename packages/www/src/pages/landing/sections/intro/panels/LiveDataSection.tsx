import { motion } from 'motion/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import { CodeBlock } from '@/components/CodeBlock';
import { BorderBeam } from '@/components/magicui/border-beam';
import { File, Folder, Tree } from '@/components/magicui/file-tree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioWidget, usePortfolioSummary } from '@/examples';
import { cn } from '@/utils/cn';

const PORTFOLIO_WIDGET_FILENAME = 'PortfolioWidget.jsx';
const PORTFOLIO_SUMMARY_FILENAME = 'usePortfolioSummary.js';

const EXAMPLE_FILE_TREE = [
  {
    id: '1',
    isSelectable: false,
    name: 'src',
    children: [
      {
        id: '2',
        isSelectable: false,
        name: 'client',
        children: [
          {
            id: '3',
            isSelectable: true,
            name: `${PORTFOLIO_WIDGET_FILENAME} (Client)`,
          },
        ],
      },
      {
        id: '4',
        isSelectable: false,
        name: 'server',
        children: [
          {
            id: '5',
            isSelectable: true,
            name: `${PORTFOLIO_SUMMARY_FILENAME} (Server)`,
          },
        ],
      },
    ],
  },
];

export function LiveDataSection(): ReactNode {
  return (
    <section className="py-16 border-t border-border/50 border-dashed">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <h2 className="text-4xl tracking-tight font-bold mb-6">
            Always live data,
            <br />
            <span className="text-primary">all the time</span>
          </h2>
          <h3 className="text-2xl text-subtitle font-medium tracking-tight leading-tight mb-4">
            ReactiveKit <b>abstracts away the complexity</b> of subscriptions, callbacks and caches.
          </h3>
          <p className="text-md text-muted-foreground mb-8">
            ReactiveKit&rsquo;s full-stack reactivity primitives make stale data a thing of the
            past. Components throughout your architecture will always reflect the latest live
            updates, automatically and efficiently, with zero effort.
          </p>
        </div>

        <motion.div
          className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-8 p-2"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.25 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-280px 0px' }}
        >
          <motion.div
            className="flex-none lg:flex-2 lg:overflow-hidden"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            <PortfolioCodeIllustration />
          </motion.div>
          <motion.div
            className="flex-0 relative"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-primary rotate-90 lg:rotate-0 lg:top-1/3">
              →
            </div>
          </motion.div>
          <motion.div
            className="flex-none lg:flex-1"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            <PortfolioWidgetExample className="example-root" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

interface PortfolioCodeIllustrationProps {
  className?: string;
}

const CSS_VARIABLES_FILE_EXPLORER = {
  '--muted': 'var(--color-slate-200)',
  '--spacing': '0.2rem',
  '--text-sm': '0.625rem',
  '--text-sm--line-height': 'calc(1 / 0.625)',
  '--radius': '4px',
} as CSSProperties;

function PortfolioCodeIllustration(props: PortfolioCodeIllustrationProps): ReactNode {
  const { className } = props;
  const [selectedTab, setSelectedTab] = useState<'server' | 'client'>('server');
  return (
    <div
      className={cn('md:flex md:flex-row md:relative md:overflow-hidden md:rounded-md', className)}
    >
      <div className="hidden w-48 md:flex flex-none flex-col rounded-l-md bg-gray-50 border-border border inset-shadow-2xs">
        <div
          className="select-none before:content-['File_explorer'] before:flex-none before:text-sm before:text-muted-foreground before:font-medium before:p-4 before:pb-3 before:uppercase before:block"
          style={CSS_VARIABLES_FILE_EXPLORER}
        >
          <Tree
            className="flex-auto pl-2"
            initialSelectedId="5"
            initialExpandedItems={['1', '2', '4']}
            elements={EXAMPLE_FILE_TREE}
          >
            <Folder element="src" value="1">
              <Folder value="2" element="client">
                <File
                  value="3"
                  isSelectable
                  isSelect={selectedTab === 'client'}
                  onClick={() => {
                    setSelectedTab('client');
                  }}
                >
                  <p>{PORTFOLIO_WIDGET_FILENAME}</p>
                </File>
              </Folder>
              <Folder value="4" element="server">
                <File
                  value="5"
                  isSelectable
                  isSelect={selectedTab === 'server'}
                  onClick={() => {
                    setSelectedTab('server');
                  }}
                >
                  <p>{PORTFOLIO_SUMMARY_FILENAME}</p>
                </File>
              </Folder>
            </Folder>
          </Tree>
        </div>
      </div>
      <div className="md:flex-auto">
        <Tabs
          defaultValue="server"
          value={selectedTab}
          onValueChange={(value) => {
            switch (value) {
              case 'server':
              case 'client':
                setSelectedTab(value);
                break;
              default:
                return;
            }
          }}
        >
          <TabsList className="w-full md:hidden">
            <TabsTrigger value="server">Server</TabsTrigger>
            <TabsTrigger value="client">Client</TabsTrigger>
          </TabsList>
          <TabsContent value="server">
            <CodeBlock
              className="md:rounded-none"
              title={`${PORTFOLIO_SUMMARY_FILENAME} (Server)`}
              source={usePortfolioSummary}
            />
          </TabsContent>
          <TabsContent value="client">
            <CodeBlock
              className="md:rounded-none"
              title={`${PORTFOLIO_WIDGET_FILENAME} (Client)`}
              source={PortfolioWidget}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface PortfolioWidgetExampleProps {
  className?: string;
}

function PortfolioWidgetExample(props: PortfolioWidgetExampleProps): ReactNode {
  const { className } = props;
  const holdings = useLivePortfolioHoldings([
    {
      symbol: 'AAPL',
      quantity: 300,
      price: 202.82,
      positive: true,
    },
    {
      symbol: 'MSFT',
      quantity: 200,
      price: 463.87,
      positive: true,
    },
    {
      symbol: 'TSLA',
      quantity: 25,
      price: 332.05,
      positive: false,
    },
  ]);
  const totalValue = holdings.reduce((acc, holding) => acc + holding.price * holding.quantity, 0);

  return (
    <div className={cn('relative rounded-xl', className)}>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Portfolio Value</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-live-indicator-foreground">Live</div>
            <div className="w-3 h-3 rounded-full bg-live-indicator-background animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="px-2 text-5xl font-light text-positive mb-6">{formatUsd(totalValue)}</div>
          <div className="space-y-3">
            <table className="table-fixed w-full whitespace-nowrap text-xs text-muted-foreground">
              <tbody>
                {holdings.map((holding) => (
                  <tr key={holding.symbol}>
                    <td className="p-1 w-8">{holding.symbol}</td>
                    <td className="p-1 w-16">({holding.quantity} shares)</td>
                    <td className="p-1 w-16 text-right font-mono">{formatUsd(holding.price)}</td>
                    <td
                      className={cn(
                        'p-1 w-22 text-right font-mono text-xs',
                        holding.positive ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {formatUsd(holding.price * holding.quantity)} {holding.positive ? '↗' : '↘'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="border-double rounded-xl">
        <BorderBeam
          className="from-transparent via-live-widget-border to-transparent"
          duration={4}
          size={100}
        />
      </div>
    </div>
  );
}

interface PortfolioHolding {
  symbol: string;
  quantity: number;
  price: number;
  positive: boolean;
}

function useLivePortfolioHoldings(holdings: Array<PortfolioHolding>): Array<PortfolioHolding> {
  const [currentHoldings, setCurrentHoldings] = useState(holdings);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHoldings((holdings) => getUpdatedHoldings(holdings));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdings]);
  return currentHoldings;
}

function getUpdatedHoldings(holdings: Array<PortfolioHolding>): Array<PortfolioHolding> {
  return holdings.map((holding) => getUpdatedHolding(holding));
}

function getUpdatedHolding(holding: PortfolioHolding): PortfolioHolding {
  return {
    ...holding,
    price: holding.price + 0.025 * (holding.positive ? 1 : -1) * Math.random(),
  };
}

function formatUsd(price: number): ReactNode {
  return `$${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
