import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ChartPanelActions from '../../../src/pages/charts/components/ChartPanelActions'

describe('ChartPanelActions', () => {
  it('calls onAddChart when Add chart is clicked', async () => {
    const user = userEvent.setup()
    const onAddChart = vi.fn()

    render(
      <ChartPanelActions
        onAddChart={onAddChart}
        panelColumns={2}
        onPanelColumnsChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add chart/i }))

    expect(onAddChart).toHaveBeenCalledOnce()
  })

  it('changes the layout to one column', async () => {
    const user = userEvent.setup()
    const onPanelColumnsChange = vi.fn()

    render(
      <ChartPanelActions
        onAddChart={vi.fn()}
        panelColumns={2}
        onPanelColumnsChange={onPanelColumnsChange}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /single column wide/i }),
    )

    expect(onPanelColumnsChange).toHaveBeenCalledOnce()
    expect(onPanelColumnsChange).toHaveBeenCalledWith(1)
  })

  it('changes the layout to two columns', async () => {
    const user = userEvent.setup()
    const onPanelColumnsChange = vi.fn()

    render(
      <ChartPanelActions
        onAddChart={vi.fn()}
        panelColumns={1}
        onPanelColumnsChange={onPanelColumnsChange}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /two column grid/i }),
    )

    expect(onPanelColumnsChange).toHaveBeenCalledOnce()
    expect(onPanelColumnsChange).toHaveBeenCalledWith(2)
  })

  it('identifies the currently selected column layout', () => {
    render(
        <ChartPanelActions
        onAddChart={vi.fn()}
        panelColumns={2}
        onPanelColumnsChange={vi.fn()}
        />,
    )

    expect(
        screen.getByRole('button', { name: /two column grid/i }),
    ).toHaveAttribute('aria-pressed', 'true')

    expect(
        screen.getByRole('button', { name: /single column wide/i }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})