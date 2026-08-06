import 'chartjs-adapter-luxon'
import PropTypes from 'prop-types'
import { getAxisBoundsAndStepValues } from '../alignAxis'
import { getChartTimeDomain } from '../timeDomain'
import ChartWrapper from '../ChartWrapper'

export default function TempChart({
  data,
  startDate,
  endDate,
  onResampleChange,
}) {
  const { leftYMin, leftYMax, leftYStep } = getAxisBoundsAndStepValues(
    data.datasets,
    [],
    10,
    5,
  )
  const chartTimeDomain = getChartTimeDomain(startDate, endDate)

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    parsing: false,
    scales: {
      x: {
        position: 'bottom',
        title: {
          display: true,
          text: 'Time',
        },
        type: 'time',
        ticks: {
          autoSkip: false,
          autoSkipPadding: 50,
          maxRotation: 0,
          major: {
            enabled: true,
          },
        },
        time: {
          displayFormats: {
            hour: 'hh:mm a',
            day: 'MM/dd',
          },
        },
        ...chartTimeDomain,
      },
      y: {
        type: 'linear',
        position: 'left',
        ticks: {
          stepSize: leftYStep,
        },
        min: leftYMin,
        max: leftYMax,
        title: {
          display: true,
          text: 'Temperature (°C)',
        },
      },
    },
  }

  return (
    <ChartWrapper
      id="temp"
      data={data}
      options={chartOptions}
      onResampleChange={onResampleChange}
    />
  )
}
TempChart.propTypes = {
  data: PropTypes.object,
  startDate: PropTypes.object,
  endDate: PropTypes.object,
  onResampleChange: PropTypes.func,
}
