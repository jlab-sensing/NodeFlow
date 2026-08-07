import { Box, Grid } from '@mui/material'
import { DateTime } from 'luxon'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import PwrChart from '../../../charts/PwrChart/PwrChart'
import VChart from '../../../charts/VChart/VChart'
import { getSensorPowerChartData } from '../../../services/chartData'
import ChartPanelPlaceholder from './ChartPanelPlaceholder'

const POWER_COLORS = ['#26C6DA', '#FF7043', '#A2708A']
const VOLTAGE_COLORS = ['#26C6DA', '#FF7043', '#A2708A']
const CURRENT_COLORS = ['#112E51', '#78909C', '#C1F7DC']

function createDataset(timestamps, values = []) {
  return timestamps.map((timestamp, index) => ({
    x: timestamp,
    y: values[index],
  }))
}

function timestampMillis(timestamp) {
  const httpDate = DateTime.fromHTTP(timestamp)
  return httpDate.isValid
    ? httpDate.toMillis()
    : DateTime.fromISO(timestamp).toMillis()
}

function selectedPowerSources(sensors) {
  return sensors.filter(
    (sensor) =>
      sensor.has_chart_data &&
      (sensor.panel_ids ?? []).some(
        (panelId) => panelId === 'power-vi' || panelId === 'power-p',
      ),
  )
}

function PowerCharts({
  sensors = [],
  axiosPrivate,
  startDate,
  endDate,
  onDataStatusChange,
  variant = 'both',
}) {
  const [resample, setResample] = useState('hour')
  const [vChartData, setVChartData] = useState({ labels: [], datasets: [] })
  const [pwrChartData, setPwrChartData] = useState({ labels: [], datasets: [] })
  const [hasData, setHasData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fetchGenerationRef = useRef(0)

  const powerSources = selectedPowerSources(sensors)

  function applyPowerChartData(powerDataBySensor, loadSensors) {
    const newVChartData = { labels: [], datasets: [] }
    const newPwrChartData = { labels: [], datasets: [] }

    loadSensors.forEach((sensor, sensorIndex) => {
      const entry = powerDataBySensor[sensor.uuid]
      const powerData = entry?.powerData
      if (!powerData) return

      const timestamps = (powerData.timestamp ?? []).map(timestampMillis)
      const hasVoltage = Array.isArray(powerData.v) && powerData.v.length > 0
      const hasCurrent = Array.isArray(powerData.i) && powerData.i.length > 0
      const hasPower = Array.isArray(powerData.p) && powerData.p.length > 0
      const name = entry.name ?? sensor.name

      if (hasVoltage) {
        newVChartData.labels = timestamps
        newVChartData.datasets.push({
          label: `${name} Voltage (mV)`,
          data: createDataset(timestamps, powerData.v),
          borderColor: VOLTAGE_COLORS[sensorIndex % VOLTAGE_COLORS.length],
          borderWidth: 2,
          fill: false,
          yAxisID: 'vAxis',
          radius: 2,
          pointRadius: 1,
        })
      }

      if (hasCurrent) {
        newVChartData.labels = timestamps
        newVChartData.datasets.push({
          label: `${name} Current (µA)`,
          data: createDataset(timestamps, powerData.i),
          borderColor: CURRENT_COLORS[sensorIndex % CURRENT_COLORS.length],
          borderWidth: 2,
          fill: false,
          yAxisID: 'cAxis',
          radius: 2,
          pointRadius: 1,
        })
      }

      if (hasPower) {
        newPwrChartData.labels = timestamps
        newPwrChartData.datasets.push({
          label: `${name} Power (µW)`,
          data: createDataset(timestamps, powerData.p),
          borderColor: POWER_COLORS[sensorIndex % POWER_COLORS.length],
          borderWidth: 2,
          fill: false,
          radius: 2,
          pointRadius: 1,
        })
      }
    })

    setVChartData(newVChartData)
    setPwrChartData(newPwrChartData)
    setHasData(
      variant === 'voltage'
        ? newVChartData.datasets.length > 0
        : variant === 'power'
          ? newPwrChartData.datasets.length > 0
          : newVChartData.datasets.length > 0 ||
            newPwrChartData.datasets.length > 0,
    )
  }

  useEffect(() => {
    if (powerSources.length === 0) return undefined

    const generation = ++fetchGenerationRef.current
    // This effect owns the asynchronous historical request lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    Promise.all(
      powerSources.map(async (sensor) => {
        const powerData = await getSensorPowerChartData(
          axiosPrivate,
          sensor.uuid,
          startDate,
          endDate,
          resample,
        )
        return [sensor.uuid, { name: sensor.name, powerData }]
      }),
    )
      .then((entries) => {
        if (generation !== fetchGenerationRef.current) return
        applyPowerChartData(Object.fromEntries(entries), powerSources)
      })
      .catch((error) => {
        if (generation !== fetchGenerationRef.current) return
        console.error('Error updating power charts:', error)
        setHasData(false)
      })
      .finally(() => {
        if (generation === fetchGenerationRef.current) setIsLoading(false)
      })

    return () => {
      fetchGenerationRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors, resample, startDate, endDate, variant])

  useEffect(() => {
    if (powerSources.length === 0) {
      // Clear chart state when the current selection has no power source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVChartData({ labels: [], datasets: [] })
      setPwrChartData({ labels: [], datasets: [] })
      setHasData(false)
      setIsLoading(false)
    }
  }, [powerSources.length])

  useEffect(() => {
    onDataStatusChange?.(hasData)
  }, [hasData, onDataStatusChange])

  if (isLoading) return <ChartPanelPlaceholder loading />
  if (!hasData)
    return powerSources.length > 0 ? <ChartPanelPlaceholder /> : null

  const chartHeight = { xs: '400px', md: '450px' }
  const panelChartSx = {
    height: '100%',
    width: '100%',
    minWidth: 0,
    minHeight: 0,
  }
  const voltageChart = (
    <VChart
      data={vChartData}
      startDate={startDate}
      endDate={endDate}
      onResampleChange={setResample}
    />
  )
  const powerChart = (
    <PwrChart
      data={pwrChartData}
      startDate={startDate}
      endDate={endDate}
      onResampleChange={setResample}
    />
  )

  if (variant === 'voltage') return <Box sx={panelChartSx}>{voltageChart}</Box>
  if (variant === 'power') return <Box sx={panelChartSx}>{powerChart}</Box>

  return (
    <>
      <Grid item sx={{ height: chartHeight }} xs={12} sm={12} md={6} p={3}>
        {voltageChart}
      </Grid>
      <Grid item sx={{ height: chartHeight }} xs={12} sm={12} md={6} p={3}>
        {powerChart}
      </Grid>
    </>
  )
}

PowerCharts.propTypes = {
  sensors: PropTypes.array,
  axiosPrivate: PropTypes.func.isRequired,
  startDate: PropTypes.any,
  endDate: PropTypes.any,
  onDataStatusChange: PropTypes.func,
  variant: PropTypes.oneOf(['both', 'voltage', 'power']),
}

export default PowerCharts
