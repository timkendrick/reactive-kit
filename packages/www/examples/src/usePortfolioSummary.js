async function usePortfolioSummary(portfolioId) {
  // Awaited values will live-update continuously
  const holdings = await usePortfolio(portfolioId);
  // All calculations will be recomputed when live values change
  const prices = await Promise.all(
    holdings.map(async (stock) => {
      // Join on additional live values wherever you need them
      const price = await useCurrentPrice(stock.symbol);
      const exposure = price * stock.amount;
      return { stock, price, exposure };
    })
  );
  let total = 0;
  for (const { exposure } of prices) { total += exposure; }
  return { prices, total };
}