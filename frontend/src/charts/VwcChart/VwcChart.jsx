import 'chartjs-adapter-luxon';
import PropTypes from 'prop-types';
import { getAxisBoundsAndStepValues } from '../alignAxis';
import { getChartTimeDomain } from '../timeDomain';
import ChartWrapper from '../ChartWrapper';
import { getVwcAxisBounds } from './vwcAxis';

export default function VwcChart({ data, startDate, endDate, onResampleChange }) {
  const vwcDatasets = data.datasets.filter((_, i) => i % 2 == 0);
  const { rightYMin, rightYMax, rightYStep } = getAxisBoundsAndStepValues(
    vwcDatasets,
    data.datasets.filter((_, i) => i % 2 == 1),
    10,
    10,
  );
  const { min: vwcMin, max: vwcMax, step: vwcStep } = getVwcAxisBounds(vwcDatasets);
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
      ecAxis: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'EC (µS/cm)',
        },
        ticks: {
          stepSize: rightYStep,
        },
        min: rightYMin,
        max: rightYMax,
      },
      vwcAxis: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'VWC (%)',
        },
        ticks: {
          stepSize: vwcStep,
        },
        min: vwcMin,
        max: vwcMax,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <ChartWrapper
      id='vwc'
      data={data}
      options={chartOptions}
      onResampleChange={onResampleChange}
    />
  );
}

VwcChart.propTypes = {
  data: PropTypes.object,
  startDate: PropTypes.object,
  endDate: PropTypes.object,
  onResampleChange: PropTypes.func,
};
