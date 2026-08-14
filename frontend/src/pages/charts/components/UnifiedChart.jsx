import { Box } from '@mui/material'
import { DateTime } from 'luxon'
import PropTypes from 'prop-types'
import { useEffect, useState, useRef } from 'react'
import { getSensorChartData } from '../../../services/chartData'
import UniversalChart from '../../../charts/UniversalChart'
import {
  measurementMatches,
  normalizeUnifiedStreamValue,
} from './unifiedChartUtils'
import { CHART_CONFIGS } from './chartConfigs'
import { buildUnifiedChartDataFromCache } from '../catalog/historicalDataLoader'
import ChartPanelPlaceholder from './ChartPanelPlaceholder'

function getSensorMeasurementData(sensorData, measurement) {
  if (!sensorData || !measurement) return null
  if (sensorData[measurement]) return sensorData[measurement]
  const normalized = measurement.toLowerCase()
  const matchedKey = Object.keys(sensorData).find(
    (key) => key !== 'name' && key.toLowerCase() === normalized,
  )
  return matchedKey ? sensorData[matchedKey] : null
}

function timestampMillis(timestamp) {
  const httpDate = DateTime.fromHTTP(timestamp)
  return httpDate.isValid
    ? httpDate.toMillis()
    : DateTime.fromISO(timestamp).toMillis()
}
function UnifiedChart({
  type,
  sensors,
  axiosPrivate,
  startDate,
  endDate,
  modeResample = 'hour',
  onDataStatusChange,
  historicalSensorByKey,
  centralHistoricalActive = false,
  historicalLoading = false,
}) {
  const [resample, setResample] = useState(modeResample)
  const chartSettings = {
    labels: [],
    datasets: [],
  }
  const [sensorChartData, setSensorChartData] = useState(chartSettings)
  const [isLoading, setIsLoading] = useState(true)
  const debounceTimer = useRef(null)
  const fetchGenerationRef = useRef(0)
  const hasLoadedDataRef = useRef(false)
  const config = CHART_CONFIGS[type]
  const { sensor_name, measurements, units, axisIds, chartId, axisPolicy } =
    config || {}

  const meas_colors = [
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

  async function getSelectedSensorChartData() {
    if (centralHistoricalActive && resample === 'hour') {
      if (
        historicalLoading ||
        !historicalSensorByKey ||
        Object.keys(historicalSensorByKey).length === 0
      ) {
        return {}
      }
      return buildUnifiedChartDataFromCache(
        sensors,
        type,
        historicalSensorByKey,
      )
    }

    const panelId = `u:${type}`
    const sensorEntries = await Promise.all(
      sensors.map(async (sensor) => {
        if (!sensor.has_chart_data) {
          return [sensor.uuid, { name: sensor.name }]
        }

        const seenMeasurements = new Set()
        const measurementsToFetch = (sensor.measurements ?? []).filter(
          (measurement) => {
            if (!(sensor.panel_ids ?? []).includes(panelId)) return false
            if (!measurementMatches(measurement, measurements)) return false

            const key = measurement.toLowerCase()
            if (seenMeasurements.has(key)) return false
            seenMeasurements.add(key)
            return true
          },
        )

        const measEntries = await Promise.all(
          measurementsToFetch.map(async (measurement) => {
            const payload = await getSensorChartData(
              axiosPrivate,
              sensor.uuid,
              measurement,
              startDate,
              endDate,
              resample,
            )
            return [measurement, payload]
          }),
        )

        return [
          sensor.uuid,
          {
            name: sensor.name,
            ...Object.fromEntries(measEntries),
          },
        ]
      }),
    )

    return Object.fromEntries(sensorEntries)
  }

  function createDataset(x, y) {
    return x.map((x, i) => {
      return {
        x: x,
        y: y[i],
      }
    })
  }

  function resolveSensorEntry(sensorChartDataById, sensorUuid) {
    return sensorChartDataById[sensorUuid]
  }

  function updateCharts() {
    if (centralHistoricalActive && resample === 'hour' && historicalLoading) {
      if (!hasLoadedDataRef.current) setIsLoading(true)
      return
    }

    const fetchGeneration = ++fetchGenerationRef.current
    if (!hasLoadedDataRef.current) setIsLoading(true)
    getSelectedSensorChartData()
      .then((sensorDataById) => {
        if (fetchGeneration !== fetchGenerationRef.current) return
        const newSensorChartData = { labels: [], datasets: [] }
        let selectCounter = 0
        for (const sensor of sensors) {
          const entry = resolveSensorEntry(sensorDataById, sensor.uuid)
          if (!entry) {
            selectCounter += 1
            continue
          }
          const name = entry.name ?? sensor.name
          const plottedMeasurements = new Set()
          for (const [idx, meas] of measurements.entries()) {
            const normalizedMeas = meas.toLowerCase()
            if (plottedMeasurements.has(normalizedMeas)) continue
            const measPayload = getSensorMeasurementData(entry, meas)
            const measDataArray = measPayload?.data
            if (Array.isArray(measDataArray) && measDataArray.length > 0) {
              const timestamp = measPayload.timestamp.map(timestampMillis)
              const normalizedData =
                sensor_name === 'TEROS12_VWC_ADJ' &&
                meas === 'Volumetric Water Content'
                  ? measDataArray.map((value) =>
                      normalizeUnifiedStreamValue(sensor_name, meas, value),
                    )
                  : measDataArray
              const measData = createDataset(timestamp, normalizedData)
              newSensorChartData.labels = timestamp
              newSensorChartData.datasets.push({
                label: name + ` ${meas} (${units[idx]})`,
                data: measData,
                borderColor:
                  meas_colors[
                    (selectCounter * measurements.length + idx) %
                      meas_colors.length
                  ],
                borderWidth: 2,
                fill: false,
                yAxisID: axisIds[idx],
                radius: 2,
                pointRadius: 1,
              })
              plottedMeasurements.add(normalizedMeas)
            }
          }
          selectCounter += 1
        }
        if (fetchGeneration !== fetchGenerationRef.current) return
        hasLoadedDataRef.current = newSensorChartData.datasets.length > 0
        setSensorChartData(newSensorChartData)
        if (!hasLoadedDataRef.current) setIsLoading(false)
      })
      .catch((error) => {
        if (fetchGeneration !== fetchGenerationRef.current) return
        console.error('Error updating charts:', error)
        setIsLoading(false)
      })
  }

  function clearCharts() {
    const newSensorChartData = {
      ...sensorChartData,
      labels: [],
      datasets: [],
    }
    setSensorChartData(Object.assign({}, newSensorChartData))
    hasLoadedDataRef.current = false
    setIsLoading(false)
  }

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      if (Array.isArray(sensors) && sensors.length) {
        updateCharts()
      } else {
        clearCharts()
      }
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sensors,
    resample,
    startDate,
    endDate,
    historicalSensorByKey,
    centralHistoricalActive,
    historicalLoading,
  ])

  const handleResampleChange = (newResample) => {
    setResample(newResample)
  }

  const hasRenderableData = sensorChartData.datasets.some(
    (ds) => Array.isArray(ds.data) && ds.data.length > 0,
  )

  // Notify parent component when data status changes
  useEffect(() => {
    if (onDataStatusChange && !isLoading) {
      onDataStatusChange(hasRenderableData)
    }
  }, [hasRenderableData, isLoading, onDataStatusChange])

  if (!config) {
    console.error(`Unknown chart type: ${type}`)
    return null
  }

  if (isLoading) {
    return <ChartPanelPlaceholder loading />
  }

  if (!hasRenderableData) {
    if (sensors?.length) {
      return <ChartPanelPlaceholder />
    }
    return null
  }

  return (
    <Box sx={{ height: '100%', width: '100%', minWidth: 0, minHeight: 0 }}>
      <UniversalChart
        data={sensorChartData}
        chartId={chartId}
        measurements={measurements}
        units={units}
        axisIds={axisIds}
        axisPolicy={axisPolicy}
        startDate={startDate}
        endDate={endDate}
        onResampleChange={handleResampleChange}
      />
    </Box>
  )
}

UnifiedChart.propTypes = {
  type: PropTypes.oneOf(Object.keys(CHART_CONFIGS)).isRequired,
  sensors: PropTypes.array,
  axiosPrivate: PropTypes.func.isRequired,
  startDate: PropTypes.any,
  endDate: PropTypes.any,
  modeResample: PropTypes.oneOf(['none', 'hour']),
  onDataStatusChange: PropTypes.func,
  historicalSensorByKey: PropTypes.object,
  centralHistoricalActive: PropTypes.bool,
  historicalLoading: PropTypes.bool,
}

export default UnifiedChart
