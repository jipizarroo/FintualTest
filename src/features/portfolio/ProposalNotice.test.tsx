import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProposalNotice } from './ProposalNotice'

describe('ProposalNotice', () => {
  it('shows a link to the result after a proposal is calculated', () => {
    const markup = renderToStaticMarkup(<ProposalNotice visible />)

    expect(markup).toContain('Propuesta calculada.')
    expect(markup).toContain('href="#proposal-title"')
    expect(markup).toContain('Ver resultado')
  })
})
