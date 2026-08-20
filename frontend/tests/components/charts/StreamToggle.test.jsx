import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import StreamToggle from '../../../src/pages/charts/components/StreamToggle'

describe('StreamToggle', () => {
  it('switches between hourly history and live readings', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    const { rerender } = render(
      <StreamToggle isStreaming={false} onToggle={onToggle} />,
    )

    expect(screen.getByRole('button', { name: 'Hourly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Live' }))
    expect(onToggle).toHaveBeenLastCalledWith(true)

    rerender(<StreamToggle isStreaming onToggle={onToggle} />)
    await user.click(screen.getByRole('button', { name: 'Hourly' }))
    expect(onToggle).toHaveBeenLastCalledWith(false)
  })
})
