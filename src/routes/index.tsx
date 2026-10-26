import { createFileRoute } from '@tanstack/react-router'
import { PortfolioDashboard } from '@/features/portfolio/PortfolioDashboard'
import { rebalancePortfolio } from '@/server/portfolio'
import { getMarketQuotes } from '@/server/market'
import type { PortfolioInput } from '@/domain/portfolio'

const demoPortfolio: PortfolioInput = {
  positions: [
    {
      symbol: 'AAPL',
      name: 'Apple',
      currentPrice: 227,
      lots: [
        { quantity: 0.8, purchasePrice: 200 },
        { quantity: 0.6, purchasePrice: 230 },
      ],
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft',
      currentPrice: 418,
      lots: [{ quantity: 0.7, purchasePrice: null }],
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA',
      currentPrice: 135,
      lots: [{ quantity: 3.25, purchasePrice: null }],
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet',
      currentPrice: 176.5,
      lots: [{ quantity: 1.75, purchasePrice: null }],
    },
  ],
  allocations: [
    { symbol: 'AAPL', targetPercent: 25 },
    { symbol: 'MSFT', targetPercent: 25 },
    { symbol: 'NVDA', targetPercent: 30 },
    { symbol: 'AMZN', targetPercent: 20 },
  ],
  quotes: [{ symbol: 'AMZN', name: 'Amazon', currentPrice: 226.5 }],
}

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Balance | Tu cartera, en equilibrio' },
      { name: 'description', content: 'Revisa tu cartera y simula una propuesta de rebalanceo.' },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <PortfolioDashboard
      initialInput={demoPortfolio}
      onRebalance={(input) => rebalancePortfolio({ data: input })}
      onRefreshPrices={(symbols) => getMarketQuotes({ data: { symbols } })}
    />
  )
}
