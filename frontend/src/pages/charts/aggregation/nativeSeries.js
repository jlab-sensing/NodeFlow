import {
  FULL_CATALOG,
  panelIdToUnifiedType,
} from '../catalog/chartsCatalog'
import { CHART_CONFIGS } from '../components/chartConfigs'

const BUILTIN_SERIES = {
  'power-vi': [
    { measurement: 'Voltage', unit: 'mV', axisId: 'vAxis' },
    { measurement: 'Current', unit: 'µA', axisId: 'cAxis' },
  ],
  'power-p': [
    { measurement: 'Power', unit: 'µW', axisId: 'y' },
  ],
  teros: [
    {
      measurement: 'Volumetric Water Content',
      unit: '%',
      axisId: 'vwcAxis',
    },
    {
      measurement: 'Electrical Conductivity',
      unit: 'µS/cm',
      axisId: 'ecAxis',
    },
  ],
  temp: [
    { measurement: 'Temperature', unit: '°C', axisId: 'y' },
  ],
}

export function nativeSeriesId(sensorUuid, measurement, unit) {
  return JSON.stringify([
    'native',
    sensorUuid,
    measurement.trim().toLowerCase(),
    unit,
  ])
}

export function buildNativeTemplates(sensors) {
  return FULL_CATALOG.flatMap((entry) => {
    const type = panelIdToUnifiedType(entry.panelId)
    const config = type ? CHART_CONFIGS[type] : null

    const definitions = config
      ? config.measurements.map((measurement, index) => ({
          measurement,
          unit: config.units[index],
          axisId: config.axisIds[index],
        }))
      : (BUILTIN_SERIES[entry.panelId] ?? [])

    const series = new Map()

    for (const sensor of sensors) {
      if (!(sensor.panel_ids ?? []).includes(entry.panelId)) {
        continue
      }

      const supported = new Set(
        (sensor.measurements ?? []).map((measurement) =>
          measurement.toLowerCase(),
        ),
      )

      for (const definition of definitions) {
        // Power's combined endpoint can return derived outputs
        // not individually advertised in sensor.measurements.
        if (
          !entry.panelId.startsWith('power-') &&
          !supported.has(definition.measurement.toLowerCase())
        ) {
          continue
        }

        const id = nativeSeriesId(
          sensor.uuid,
          definition.measurement,
          definition.unit,
        )

        series.set(id, {
          id,
          label:
            `${sensor.name} · ${definition.measurement} ` +
            `(${definition.unit}) · ${String(sensor.uuid).slice(0, 8)}`,
          axisId: definition.axisId,
        })
      }
    }

    return series.size
      ? [{
          id: entry.panelId,
          label: entry.label,
          description: entry.description,
          category: entry.category,
          series: [...series.values()],
        }]
      : []
  })
}