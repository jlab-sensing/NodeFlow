import { render, screen, waitFor } from '@testing-library/react'
import { DateTime } from 'luxon'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Charts from '../../../src/pages/charts/Charts'
import { useChartSources } from '../../../src/services/chartSources'
import { getSensorDataAvailability } from '../../../src/services/dataAvailability'

const routerState = vi.hoisted(() => ({
  searchParams: undefined,
  setSearchParams: vi.fn(),
}))

const axiosPrivate = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [
    routerState.searchParams,
    routerState.setSearchParams,
  ],
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/charts' }),
}))

vi.mock('../../../src/components/TopNav', () => ({
  default: () => <div data-testid="top-nav">TopNav</div>,
}))

vi.mock('../../../src/auth/hooks/useAxiosPrivate', () => ({
  default: () => axiosPrivate,
}))

vi.mock('../../../src/services/chartSources', () => ({
  useChartSources: vi.fn(),
}))

vi.mock('../../../src/services/dataAvailability', () => ({
  getSensorDataAvailability: vi.fn(),
}))

vi.mock('../../../src/pages/charts/hooks/useChartsHistoricalData', () => ({
  useChartsHistoricalData: () => ({
    historicalSensorByKey: {},
    historicalLoading: false,
  }),
}))

vi.mock('../../../src/pages/charts/components/BackBtn', () => ({
  default: () => <div>Back</div>,
}))

vi.mock('../../../src/pages/charts/components/GroupSensorSelect', () => ({
  default: () => <div>Sensor selector</div>,
}))

vi.mock('../../../src/pages/charts/components/DateRangeSel', () => ({
  default: ({ startDate, endDate }) => (
    <div>
      <span data-testid="start-date">{startDate.toISO()}</span>
      <span data-testid="end-date">{endDate.toISO()}</span>
    </div>
  ),
}))

vi.mock('../../../src/pages/charts/components/StreamToggle', () => ({
  default: () => <div>Stream toggle</div>,
}))

vi.mock('../../../src/pages/charts/components/ChartPanelActions', () => ({
  default: () => <div>Chart actions</div>,
}))

vi.mock('../../../src/pages/charts/components/ChartPanelGrid', () => ({
  default: () => <div>Chart grid</div>,
}))

vi.mock('../../../src/pages/charts/components/AddChartModal', () => ({
  default: () => null,
}))

const chartSources = {
  groups: [{ uuid: 'group-1', name: 'Group 1' }],
  sensors: [
    {
      uuid: 'sensor-1',
      name: 'Sensor 1',
      group_id: 'group-1',
      has_chart_data: true,
      measurements: ['temperature'],
      panel_ids: ['u:temperature'],
    },
  ],
}

describe('Charts smart date range', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.searchParams = new URLSearchParams({ sensor_id: 'sensor-1' })
    useChartSources.mockReturnValue({
      data: chartSources,
      isLoading: false,
      isError: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('applies the latest two-week range when recent data exists', async () => {
    const latest = DateTime.fromISO('2026-08-10T12:00:00Z')

    getSensorDataAvailability.mockResolvedValue({
      latest_timestamp: latest.toISO(),
      earliest_timestamp: DateTime.fromISO('2026-01-01T00:00:00Z').toISO(),
      has_recent_data: true,
    })

    render(<Charts />)

    await waitFor(() => {
      expect(getSensorDataAvailability).toHaveBeenCalledWith(axiosPrivate, [
        'sensor-1',
      ])
      expect(screen.getByTestId('start-date')).toHaveTextContent(
        latest.minus({ days: 14 }).toISO(),
      )
      expect(screen.getByTestId('end-date')).toHaveTextContent(latest.toISO())
    })

    expect(
      screen.queryByText(/No recent data available/i),
    ).not.toBeInTheDocument()
  })

  it('applies the fallback range and shows a notification when recent data does not exist', async () => {
    const latest = DateTime.fromISO('2026-07-10T12:00:00Z')

    getSensorDataAvailability.mockResolvedValue({
      latest_timestamp: latest.toISO(),
      earliest_timestamp: DateTime.fromISO('2025-01-01T00:00:00Z').toISO(),
      has_recent_data: false,
    })

    render(<Charts />)

    expect(
      await screen.findByText(/No recent data available/i),
    ).toBeInTheDocument()
    expect(getSensorDataAvailability).toHaveBeenCalledWith(axiosPrivate, [
      'sensor-1',
    ])
    expect(screen.getByTestId('start-date')).toHaveTextContent(
      latest.minus({ days: 14 }).toISO(),
    )
    expect(screen.getByTestId('end-date')).toHaveTextContent(latest.toISO())
    expect(screen.getByTestId('top-nav')).toBeInTheDocument()
  })
})
