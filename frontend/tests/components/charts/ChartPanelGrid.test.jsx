import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ChartPanelGrid from '../../../src/pages/charts/components/ChartPanelGrid'

vi.mock('../../../src/pages/charts/components/PowerCharts', () => ({
  default: ({ variant }) => <div>Power chart: {variant}</div>,
}))

vi.mock('../../../src/pages/charts/components/TerosCharts', () => ({
  default: ({ variant }) => <div>TEROS chart: {variant}</div>,
}))

vi.mock('../../../src/pages/charts/components/UnifiedChart', () => ({
  default: ({ type }) => <div>Unified chart: {type}</div>,
}))

vi.mock('../../../src/pages/charts/components/SortableChartPanel', () => ({
  default: ({ id, children, onRemove }) => {
    if (children == null) {
      return null
    }

    return (
      <section data-testid={`panel-${id}`}>
        {children}

        {onRemove && (
          <button type="button" onClick={() => onRemove(id)}>
            Remove {id}
          </button>
        )}
      </section>
    )
  },
}))

describe('ChartPanelGrid', () => {
  const chartProps = {
    sensors: [],
    axiosPrivate: vi.fn(),
    startDate: null,
    endDate: null,
    historicalSensorByKey: {},
    historicalLoading: false,
    centralHistoricalActive: {
      sensors: false,
    },
    onPowerDataStatusChange: vi.fn(),
    onTerosDataStatusChange: vi.fn(),
  }

  it('renders the correct chart component for known panel IDs', () => {
    render(
      <ChartPanelGrid
        panelOrder={['power-vi', 'power-p', 'teros', 'temp', 'u:co2']}
        onPanelOrderChange={vi.fn()}
        onRemovePanel={vi.fn()}
        panelColumns={2}
        chartProps={chartProps}
      />,
    )

    expect(screen.getByText('Power chart: voltage')).toBeInTheDocument()
    expect(screen.getByText('Power chart: power')).toBeInTheDocument()
    expect(screen.getByText('TEROS chart: vwc')).toBeInTheDocument()
    expect(screen.getByText('TEROS chart: temp')).toBeInTheDocument()
    expect(screen.getByText('Unified chart: co2')).toBeInTheDocument()
  })

  it('passes the selected panel ID to the remove callback', async () => {
    const user = userEvent.setup()
    const onRemovePanel = vi.fn()

    render(
      <ChartPanelGrid
        panelOrder={['power-vi', 'u:co2']}
        onPanelOrderChange={vi.fn()}
        onRemovePanel={onRemovePanel}
        panelColumns={2}
        chartProps={chartProps}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Remove power-vi' }),
    )

    expect(onRemovePanel).toHaveBeenCalledOnce()
    expect(onRemovePanel).toHaveBeenCalledWith('power-vi')
  })

  it('does not allow the only remaining panel to be removed', () => {
    render(
      <ChartPanelGrid
        panelOrder={['power-vi']}
        onPanelOrderChange={vi.fn()}
        onRemovePanel={vi.fn()}
        panelColumns={2}
        chartProps={chartProps}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Remove power-vi' }),
    ).not.toBeInTheDocument()
  })

  it('returns null when panel order is empty', () => {
    const { container } = render(
      <ChartPanelGrid
        panelOrder={[]}
        onPanelOrderChange={vi.fn()}
        onRemovePanel={vi.fn()}
        panelColumns={2}
        chartProps={chartProps}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})