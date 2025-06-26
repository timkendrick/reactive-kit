async function PortfolioWidget({ portfolioId }) {
  // Awaited values will live-update continuously
  const { prices, total } = await usePortfolioSummary(portfolioId);
  const formattedPrices = prices.map((holding) => ({
    symbol: holding.stock.symbol,
    amount: `(${holding.stock.amount} shares)`,
    price: formatUsd(holding.price),
    exposure: formatUsd(holding.exposure),
  }));
  return (
    <Card title="Portfolio Value">
      <h1>{total}</h1>
      <Table rows={formattedPrices} />
    </Card>
  );
}