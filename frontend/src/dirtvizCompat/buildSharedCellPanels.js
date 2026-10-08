import { DateTime } from 'luxon'
import { CHART_CONFIGS } from '../pages/charts/components/chartConfigs'
import { toPercentIfFraction } from '../charts/VwcChart/vwcValue'

const COLORS = [
  '#26C6DA',
  '#FF7043',
  '#A2708A',
  '#FF5722',
  '#607D8B',
  '#4CAF50',
  '#FF9800',
  '#9C27B0',
  '#2196F3',
  '#E91E63',
]

const CURRENT_COLORS = ['#112E51', '#78909C', '#C1F7DC']

const BUILTINS = [
  {
    id: 'power-vi',
    kind: 'voltage',
    title: 'Voltage & Current',
    source: 'power',
    series: [
      ['v', 'Voltage', 'mV', 'vAxis'],
      ['i', 'Current', 'µA', 'cAxis'],
    ],
  },
  {
    id: 'power-p',
    kind: 'power',
    title: 'Power',
    source: 'power',
    series: [['p', 'Power', 'µW', 'y']],
  },
  {
    id: 'teros',
    kind: 'vwc',
    title: 'VWC & EC',
    source: 'teros',
    series: [
      ['vwc', 'Volumetric Water Content', '%', 'vwcAxis'],
      ['ec', 'Electrical Conductivity', 'µS/cm', 'ecAxis'],
    ],
  },
  {
    id: 'temp',
    kind: 'temperature',
    title: 'Temperature',
    source: 'teros',
    series: [['temp', 'Temperature', '°C', 'y']],
  },
]

const UNIFIED = [
  ['co2', 'CO₂'],
  ['presHum', 'Pressure & humidity'],
  ['bme280Pressure', 'BME280 pressure'],
  ['soilPot', 'Soil water potential'],
  ['soilHum', 'Soil humidity'],
  ['waterPress', 'Water pressure'],
  ['waterFlow', 'Water flow'],
  ['sensor', 'Dielectric permittivity'],
  ['temperature', 'Temperature (BME280)'],
]

function matches(channel, config) {
  return (
    channel.name === config.sensor_name &&
    config.measurements.some(
      (measurement) =>
        measurement.toLowerCase() === channel.measurement.toLowerCase(),
    )
  )
}

function dynamicIdentity(channel) {
  return JSON.stringify([
    channel.name.trim().toLowerCase(),
    channel.measurement.trim().toLowerCase(),
  ])
}

function namedType(channel) {
  return UNIFIED.find((entry) => matches(channel, CHART_CONFIGS[entry[0]]))?.[0]
}

function panelSpecs(rows) {
  const channels = rows.flatMap((row) => row.numeric)

  const catalogIds = new Set(
    rows.flatMap((row) =>
      (row.catalog.entries ?? []).map((entry) => entry.panel_id),
    ),
  )

  const specs = BUILTINS.filter((spec) => catalogIds.has(spec.id))

  const available = UNIFIED.filter(
    ([type]) =>
      catalogIds.has('u:' + type) ||
      channels.some((channel) => matches(channel, CHART_CONFIGS[type])),
  )

  const hasPressureHumidity = available.some(([type]) => type === 'presHum')

  for (const [type, title] of available) {
    if (type === 'bme280Pressure' && hasPressureHumidity) continue

    specs.push({
      id: 'u:' + type,
      kind: 'universal',
      title,
      config: CHART_CONFIGS[type],
    })
  }

  const seen = new Set()

  const ordered = [...channels].sort((a, b) => a.sensor_id - b.sensor_id)

  for (const channel of ordered) {
    if (namedType(channel)) continue

    const identity = dynamicIdentity(channel)

    if (seen.has(identity)) continue
    seen.add(identity)

    specs.push({
      id: 'sensor:' + identity,
      dirtvizPanelId: 's:' + channel.sensor_id,
      kind: 'universal',
      title: channel.name + ' . ' + channel.measurement,
      identity,
      config: {
        sensor_name: channel.name,
        measurements: [channel.measurement],
        units: [channel.unit || ''],
        axisIds: ['y'],
        chartId: 'db-sensor-' + channel.sensor_id,
      },
    })
  }
  return specs
}

function pointsFrom(result, field, transform = (value) => value) {
  if (!result) return []

  if (result.status != 'ready') {
    throw new Error(result.error || 'History is unavailable')
  }

  const timestamps = result.data?.timestamp
  const values = result.data?.[field]

  if (
    !Array.isArray(timestamps) ||
    !Array.isArray(values) ||
    timestamps.length != values.length
  ) {
    throw new Error('mismatched timestamp/' + field + ' arrays')
  }

  return timestamps.map((timestamp, index) => {
    const parsed =
      typeof timestamp === 'string' ? DateTime.fromHTTP(timestamp) : null

    if (!parsed?.isValid) {
      throw new Error('invalid HTTP timestamp at index' + index)
    }

    const value = values[index]

    const numeric =
      typeof value === 'number' ||
      (typeof value === 'string' && value.trim() !== '')

    if (value !== null && (!numeric || !Number.isFinite(Number(value)))) {
      throw new Error('invalid numeric value at index ' + index)
    }
    return {
      x: parsed.toMillis(),
      y: transform(value === null ? null : Number(value)),
    }
  })
}

function makeDataset(id, label, points, color, axis, extra = {}) {
  return {
    id,
    label,
    data: points,
    borderColor: color,
    borderWidth: 2,
    fill: false,
    yAxisID: axis,
    radius: 2,
    pointRadius: 1,
    ...extra,
  }
}

export function buildSharedCellPanels({
  catalogs = [],
  historiesByUuid = {},
} = {}) {
  if (!Array.isArray(catalogs)) {
    throw new TypeError('catalogs must be an array')
  }

  const warnings = new Set()
  const unplottedChannels = []
  const rows = []
  const seenCells = new Set()
  const instances = new Set()

  const warn = (catalog, scope, message) => {
    warnings.add(
      (catalog.name || 'Cell ' + catalog.cell_id) +
        ' [' +
        scope +
        ']: ' +
        message,
    )
  }

  for (const catalog of catalogs) {
    for (const issue of catalog.errors ?? []) {
      warn(catalog, issue.scope || 'catalog', issue.error)
    }

    if (!catalog.enabled || !['ready', 'partial'].includes(catalog.status)) {
      continue
    }

    const identity = JSON.stringify([catalog.source_instance, catalog.cell_id])

    if (seenCells.has(identity)) {
      throw new Error(
        'this chart view expects one configured dirtview instance',
      )
    }

    seenCells.add(identity)
    instances.add(catalog.source_instance)

    let history = historiesByUuid[catalog.uuid]

    if (
      history &&
      (history.cell?.uuid !== catalog.uuid ||
        history.cell?.cell_id !== catalog.cell_id ||
        history.cell?.source_instance !== catalog.source_instance)
    ) {
      warn(catalog, 'history', 'History belongs to a different shared cell')

      history = undefined
    }

    for (const issue of history?.errors ?? []) {
      warn(catalog, issue.scope || 'history', issue.error)
    }

    const numeric = []

    for (const channel of catalog.channels ?? []) {
      let reason = channel.error

      if (!reason && channel.source == 'sensor') {
        if (channel.data_type === 'text') {
          reason = 'Text measurement: cannot be plotted on numeric chart'
        } else if (!['int', 'float'].includes(channel.data_type)) {
          reason = 'Unsupported data type: ' + channel.data_type
        } else if (
          !Number.isSafeInteger(channel.sensor_id) ||
          channel.sensor_id <= 0 ||
          typeof channel.name !== 'string' ||
          !channel.name.trim() ||
          typeof channel.measurement !== 'string' ||
          !channel.measurement.trim()
        ) {
          reason = 'invalid sensor metadata'
        } else {
          numeric.push(channel)
        }
      } else if (
        !reason &&
        channel.source === 'teros' &&
        channel.field === 'raw_vwc'
      ) {
        reason = 'Raw VWC: no default Dirtviz chart panel'
      }

      if (reason) {
        unplottedChannels.push({
          cellUuid: catalog.uuid,
          cellName: catalog.name,
          channel,
          reason,
        })

        if (channel.error) {
          warn(catalog, channel.key, reason)
        }
      }
    }

    rows.push({
      catalog,
      history,
      numeric,
    })
  }

  if (instances.size > 1) {
    throw new Error(
      'This chart view expects one configured Dirtviz instance',
      ``,
    )
  }

  const panels = panelSpecs(rows).map((spec) => {
    const datasets = []
    let labels = []

    rows.forEach(({ catalog, history, numeric }, cellIndex) => {
      const name = catalog.name || 'Cell ' + catalog.cell_id

      const seriesId = (key) =>
        JSON.stringify([catalog.source_instance, catalog.uuid, key])

      if (spec.source) {
        try {
          const result = history?.[spec.source]

          const paired = spec.series.map(([field]) => pointsFrom(result, field))

          if (!paired.some((points) => points.length)) return

          spec.series.forEach(([field, measurement, unit, axis], index) => {
            const points = paired[index]

            const palette = field === 'i' ? CURRENT_COLORS : COLORS.slice(0, 3)

            datasets.push(
              makeDataset(
                seriesId(spec.source + ':' + field),
                name + '' + measurement + ' (' + unit + ')',
                points,
                palette[cellIndex % palette.length],
                axis,
                field === 'ec'
                  ? {
                      pointRadius: 0,
                      borderDash: [5, 5],
                    }
                  : {},
              ),
            )
            labels = points.map((point) => point.x)
          })
        } catch (error) {
          warn(catalog, spec.source, error.message)
        }

        return
      }

      const config = spec.config

      config.measurements.forEach((measurement, measurementIndex) => {
        const candidates = numeric.filter((channel) =>
          spec.identity
            ? dynamicIdentity(channel) === spec.identity
            : channel.name === config.sensor_name &&
              channel.measurement.toLowerCase() === measurement.toLowerCase(),
        )

        if (candidates.length === 0) return

        if (candidates.length > 1) {
          warn(
            catalog,
            spec.id,
            'Ambiguous measurement; cannot choose a sensor',
          )

          return
        }
        const channel = candidates[0]

        if (spec.identity && (channel.unit || '') !== config.units[0]) {
          warn(
            catalog,
            channel.key,
            'unit conflicts with this panel; series not plotted',
          )
          return
        }

        try {
          const transform =
            config.sensor_name === 'TEROS12_VWC_ADJ' &&
            measurement === 'Volumetric Water Content'
              ? toPercentIfFraction
              : (value) => value

          const points = pointsFrom(
            history?.sensors?.[String(channel.sensor_id)],
            'data',
            transform,
          )

          if (!points.length) return

          datasets.push(
            makeDataset(
              seriesId(channel.key),
              name +
                ' ' +
                measurement +
                ' (' +
                config.units[measurementIndex] +
                ')',
              points,
              COLORS[
                (cellIndex * config.measurements.length + measurementIndex) %
                  COLORS.length
              ],
              config.axisIds[measurementIndex],
            ),
          )
          labels = points.map((point) => point.x)
        } catch (error) {
          warn(catalog, channel.key, error.message)
        }
      })
    })

    return {
      id: spec.id,
      dirtvizPanelId: spec.dirtvizPanelId || spec.id,
      kind: spec.kind,
      title: spec.title,

      config: spec.config
        ? {
            ...spec.config,
            measurements: [...spec.config.measurements],
            units: [...spec.config.units],
            axisIds: [...spec.config.axisIds],
          }
        : undefined,

      data: {
        labels,
        datasets,
      },
      hasData: datasets.some((dataset) =>
        dataset.data.some((point) => point.y !== null),
      ),
    }
  })

  return {
    panels,
    unplottedChannels,
    warnings: [...warnings],
  }
}
