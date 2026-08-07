import { useEffect, useMemo, useState } from 'react'
import { fetchChartsSensorData } from '../catalog/historicalDataLoader'

const EMPTY = {}

/**
 * Central UUID-keyed historical loader for every measurement-based panel.
 * PowerCharts uses its owned UUID endpoint separately because its response is
 * a combined voltage/current/power payload rather than a single measurement.
 */
export function useChartsHistoricalData({
  axiosPrivate,
  sensors,
  panelOrder,
  startDate,
  endDate,
  resample = 'hour',
  enabled = true,
}) {
  const [historicalSensorByKey, setHistoricalSensorByKey] = useState(EMPTY)
  const [historicalLoading, setHistoricalLoading] = useState(false)

  const panelOrderKey = useMemo(() => panelOrder.join(','), [panelOrder])
  const rangeKey = useMemo(
    () => `${startDate.toISO()}|${endDate.toISO()}`,
    [startDate, endDate],
  )
  const sensorInputsKey = useMemo(
    () =>
      JSON.stringify(
        sensors.map(
          ({
            uuid,
            name,
            has_chart_data: hasChartData,
            measurements,
            panel_ids: panelIds,
          }) => ({
            uuid,
            name,
            hasChartData,
            measurements,
            panelIds,
          }),
        ),
      ),
    [sensors],
  )
  const sensorSnapshot = useMemo(
    () =>
      sensors.map(
        ({
          uuid,
          name,
          has_chart_data: hasChartData,
          measurements,
          panel_ids: panelIds,
        }) => ({
          uuid,
          name,
          has_chart_data: hasChartData,
          measurements,
          panel_ids: panelIds,
        }),
      ),
    [sensors],
  )
  const panelOrderSnapshot = useMemo(() => [...panelOrder], [panelOrder])

  useEffect(() => {
    if (!enabled || sensors.length === 0 || !panelOrderKey) {
      // Reset the UUID-keyed cache when historical requests are inactive.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistoricalLoading(false)
      setHistoricalSensorByKey(EMPTY)
      return undefined
    }

    let cancelled = false
    setHistoricalLoading(true)
    fetchChartsSensorData({
      axiosPrivate,
      sensors: sensorSnapshot,
      panelOrder: panelOrderSnapshot,
      startDate,
      endDate,
      resample,
    })
      .then(({ historicalSensorByKey: nextCache }) => {
        if (!cancelled) setHistoricalSensorByKey(nextCache)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Chart sensor historical load failed:', error)
        setHistoricalSensorByKey(EMPTY)
      })
      .finally(() => {
        if (!cancelled) setHistoricalLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    sensors.length,
    sensorInputsKey,
    panelOrderKey,
    rangeKey,
    resample,
    axiosPrivate,
    sensorSnapshot,
    panelOrderSnapshot,
    startDate,
    endDate,
  ])

  return { historicalSensorByKey, historicalLoading }
}
