import { createServerFn } from '@tanstack/react-start'
import { calculateRebalance, validatePortfolioInput } from '@/domain/portfolio'

export const rebalancePortfolio = createServerFn({ method: 'POST' })
  .validator(validatePortfolioInput)
  .handler(({ data }) => calculateRebalance(data))
