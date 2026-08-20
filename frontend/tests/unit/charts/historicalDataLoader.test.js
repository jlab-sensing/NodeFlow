import { DateTime } from 'luxon'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSensorChartData } from '../../../src/services/chartData'
import {
  buildUnifiedChartDataFromCache,
  collectUnifiedSensorRequests,
  fetchChartsSensorData,
  sensorDataCacheKey,
} from '../../../src/pages/charts/catalog/historicalDataLoader'

vi.mock('../../../src/services/chartData', () => ({
  getSensorChartData: vi.fn(),
}))

describe('historicalDataLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates unified sensor requests across panels and sensors', () => {
    const sensors = [
      {
        uuid: 'sensor-1',
        name: 'Sensor One',
        has_chart_data: true,
        panel_ids: ['u:co2', 'u:presHum'],
        measurements: ['co2', 'pressure', 'humidity'],
      },
      {
        uuid: 'sensor-2',
        name: 'Sensor Two',
        has_chart_data: true,
        panel_ids: ['u:co2'],
        measurements: ['co2'],
      },
    ]

    const requests = collectUnifiedSensorRequests(
      ['u:co2', 'u:presHum'],
      sensors,
    )

    const keys = requests.map((request) => request.cacheKey)

    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain(sensorDataCacheKey('sensor-1', 'co2'))
    expect(keys).toContain(sensorDataCacheKey('sensor-1', 'pressure'))
    expect(keys).toContain(sensorDataCacheKey('sensor-1', 'humidity'))
    expect(keys).toContain(sensorDataCacheKey('sensor-2', 'co2'))
  })

  it('builds unified chart data from cached sensor data', () => {
    const cacheKey = sensorDataCacheKey('sensor-1', 'co2')
    const payload = {
      timestamp: ['2026-06-18T00:00:00Z'],
      data: [800],
    }

    const sensors = [
      {
        uuid: 'sensor-1',
        name: 'CO2 Sensor',
        panel_ids: ['u:co2'],
        measurements: ['co2'],
      },
    ]

    const chartData = buildUnifiedChartDataFromCache(sensors, 'co2', {
      [cacheKey]: payload,
    })

    expect(chartData['sensor-1']).toEqual({
      name: 'CO2 Sensor',
      co2: payload,
    })
  })

  it('fetches historical sensor data for selected panels', async () => {
    const payload = {
      timestamp: [],
      data: [800],
    }

    getSensorChartData.mockResolvedValue(payload)

    const axiosPrivate = vi.fn()
    const startDate = DateTime.fromISO('2026-06-01T00:00:00Z')
    const endDate = DateTime.fromISO('2026-06-02T00:00:00Z')

    const sensors = [
      {
        uuid: 'sensor-1',
        name: 'CO2 Sensor',
        has_chart_data: true,
        panel_ids: ['u:co2'],
        measurements: ['co2'],
      },
    ]

    const result = await fetchChartsSensorData({
      axiosPrivate,
      sensors,
      panelOrder: ['u:co2'],
      startDate,
      endDate,
    })

    expect(getSensorChartData).toHaveBeenCalledWith(
      axiosPrivate,
      'sensor-1',
      'co2',
      startDate,
      endDate,
      'hour',
    )

    expect(result.historicalSensorByKey).toHaveProperty(
      sensorDataCacheKey('sensor-1', 'co2'),
      payload,
    )
  })
})
