import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import AddChartModal from '../../../src/pages/charts/components/AddChartModal'

describe('AddChartModal', () => {
  it('shows an available chart and adds it when selected', async () => {
    const user = userEvent.setup()
    const onAddPanel = vi.fn()
    const onClose = vi.fn()

    const selectedSensors = [
      {
        uuid: 'sensor-1',
        panel_ids: ['power-vi', 'u:co2'],
      },
    ]

    render(
      <AddChartModal
        open
        onClose={onClose}
        selectedSensors={selectedSensors}
        panelOrder={['power-vi']}
        onAddPanel={onAddPanel}
      />,
    )

    expect(
      screen.getByRole('button', { name: /CO₂/i }),
    ).toBeInTheDocument()

    expect(screen.queryByText('Voltage & Current')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /CO₂/i }))

    expect(onAddPanel).toHaveBeenCalledOnce()
    expect(onAddPanel).toHaveBeenCalledWith('u:co2')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows an empty message when every supported chart is already displayed', () => {
    const selectedSensors = [
      {
        uuid: 'sensor-1',
        panel_ids: ['power-vi', 'u:co2'],
      },
    ]

    render(
      <AddChartModal
        open
        onClose={vi.fn()}
        selectedSensors={selectedSensors}
        panelOrder={['power-vi', 'u:co2']}
        onAddPanel={vi.fn()}
      />,
    )

    expect(
      screen.getByText(
        'All charts supported by the selected sensors are already displayed.',
      ),
    ).toBeInTheDocument()
  })
})