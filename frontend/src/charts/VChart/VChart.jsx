import 'chartjs-adapter-luxon';
import PropTypes from 'prop-types';
import { getAxisBoundsAndStepValues } from '../alignAxis';
import { getChartTimeDomain } from '../timeDomain';
import ChartWrapper from '../ChartWrapper';

export default function VChart({ data, startDate, endDate, onResampleChange }) {
  const { leftYMin, leftYMax, leftYStep, rightYMin, rightYMax, rightYStep } = getAxisBoundsAndStepValues(
    data.datasets.filter((_, i) => i % 2 == 0),
    data.datasets.filter((_, i) => i % 2 == 1),
    10,
    10,
  );
  const chartTimeDomain = getChartTimeDomain(startDate, endDate);

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
      vAxis: {
        position: 'left',
        title: {
          display: true,
          text: 'Voltage (mV)',
        },
        ticks: {
          stepSize: leftYStep,
        },
        min: leftYMin,
        max: leftYMax,
        grid: {
          drawOnChartArea: false,
        },
      },
      cAxis: {
        position: 'right',
        title: {
          display: true,
          text: 'Current (µA)',
        },
        ticks: {
          stepSize: rightYStep,
        },
        min: rightYMin,
        max: rightYMax,
      },
    },
  };

  return (
    <ChartWrapper
      id='v'
      data={data}
      options={chartOptions}
      onResampleChange={onResampleChange}
    />
  );
}

VChart.propTypes = {
  data: PropTypes.object,
  startDate: PropTypes.object,
  endDate: PropTypes.object,
  onResampleChange: PropTypes.func,
};
