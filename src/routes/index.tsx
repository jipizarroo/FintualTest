import { createFileRoute } from '@tanstack/react-router'
import { PortfolioDashboard } from '@/features/portfolio/PortfolioDashboard'
import { rebalancePortfolio } from '@/server/portfolio'
import type { PortfolioInput } from '@/domain/portfolio'

const demoPortfolio: PortfolioInput = {
  positions: [
    { symbol: 'AAPL', name: 'Apple', quantity: 1.4, currentPrice: 227 },
    { symbol: 'MSFT', name: 'Microsoft', quantity: 0.7, currentPrice: 418 },
    { symbol: 'NVDA', name: 'NVIDIA', quantity: 3.25, currentPrice: 135 },
    { symbol: 'GOOGL', name: 'Alphabet', quantity: 1.75, currentPrice: 176.5 },
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
    />
  )
}
