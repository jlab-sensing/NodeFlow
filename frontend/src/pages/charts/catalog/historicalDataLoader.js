import { getSensorChartData } from '../../../services/chartData'
import { CHART_CONFIGS } from '../components/chartConfigs'
import { panelIdToUnifiedType } from './chartsCatalog'
import { measurementMatches } from '../components/unifiedChartUtils'

export { measurementMatches }

const BUILTIN_SENSOR_CONFIGS = {
  teros: {
    measurements: ['Volumetric Water Content', 'Electrical Conductivity'],
  },
  temp: {
    measurements: ['Temperature'],
  },
}

export function sensorDataCacheKey(sensorUuid, measurement) {
  return `${sensorUuid}:${measurement}`.toLowerCase()
}

function measurementsForPanel(sensor, panelId, config) {
  if (!(sensor.panel_ids ?? []).includes(panelId)) return []

  const seen = new Set()
  return (sensor.measurements ?? []).filter((measurement) => {
    if (!measurementMatches(measurement, config.measurements)) return false

    const key = measurement.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Build one request per selected sensor UUID and measurement. A sensor is
 * included only when its chart-source capabilities contain the panel.
 */
export function collectUnifiedSensorRequests(panelOrder, sensors) {
  const requests = []
  const seen = new Set()

  panelOrder.forEach((panelId) => {
    const unifiedType = panelIdToUnifiedType(panelId)
    const config = unifiedType
      ? CHART_CONFIGS[unifiedType]
      : BUILTIN_SENSOR_CONFIGS[panelId]
    if (!config) return

    sensors.forEach((sensor) => {
      if (!sensor.has_chart_data) return

      measurementsForPanel(sensor, panelId, config).forEach((measurement) => {
        const cacheKey = sensorDataCacheKey(sensor.uuid, measurement)
        if (seen.has(cacheKey)) return

        seen.add(cacheKey)
        requests.push({
          cacheKey,
          sensorUuid: sensor.uuid,
          measurement,
        })
      })
    })
  })

  return requests
}

/**
 * Convert the UUID-keyed cache into the object shape consumed by
 * UnifiedChart: { [sensorUuid]: { name, [measurement]: payload } }.
 */
export function buildUnifiedChartDataFromCache(
  sensors,
  unifiedType,
  historicalSensorByKey,
) {
  const panelId = `u:${unifiedType}`
  const config = CHART_CONFIGS[unifiedType]
  if (!config) return {}

  const entries = sensors.map((sensor) => {
    const measurementEntries = measurementsForPanel(sensor, panelId, config)
      .map((measurement) => {
        const cacheKey = sensorDataCacheKey(sensor.uuid, measurement)
        const payload = historicalSensorByKey[cacheKey]
        return payload ? [measurement, payload] : null
      })
      .filter(Boolean)

    return [
      sensor.uuid,
      {
        name: sensor.name,
        ...Object.fromEntries(measurementEntries),
      },
    ]
  })

  return Object.fromEntries(entries)
}

/**
 * Fetch historical data for unified sensor panels through NodeFlow's owned,
 * UUID-based chart-data endpoint.
 */
export async function fetchChartsSensorData({
  axiosPrivate,
  sensors,
  panelOrder,
  startDate,
  endDate,
  resample = 'hour',
}) {
  if (!sensors.length || !panelOrder.length) {
    return { historicalSensorByKey: {} }
  }

  const sensorRequests = collectUnifiedSensorRequests(panelOrder, sensors)
  const entries = await Promise.all(
    sensorRequests.map(async ({ cacheKey, sensorUuid, measurement }) => {
      const payload = await getSensorChartData(
        axiosPrivate,
        sensorUuid,
        measurement,
        startDate,
        endDate,
        resample,
      )
      return [cacheKey, payload]
    }),
  )

  return { historicalSensorByKey: Object.fromEntries(entries) }
}
