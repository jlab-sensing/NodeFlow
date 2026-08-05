import 'chartjs-adapter-luxon';
import PropTypes from 'prop-types';
import { getAxisBoundsAndStepValues } from './alignAxis';
import { getChartTimeDomain } from './timeDomain';
import ChartWrapper from './ChartWrapper';
import { chartPlugins } from './plugins';
import { getVwcAxisBounds } from './VwcChart/vwcAxis';

export default function UniversalChart({ data, chartId, measurements, units, axisIds, axisPolicy, startDate, endDate, onResampleChange }) {
  // Build chart options dynamically based on measurements
  const buildChartOptions = () => {
    const chartTimeDomain = getChartTimeDomain(startDate, endDate);

    const scales = {
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
    };

    // Handle single measurement (left axis only)
    if (measurements.length === 1) {
      const { leftYMin, leftYMax, leftYStep } = getAxisBoundsAndStepValues(data.datasets, [], 10, 5);
      const singleAxisBounds = axisPolicy === 'vwcPercent' ? getVwcAxisBounds(data.datasets, 10) : null;

      scales.y = {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: `${measurements[0].charAt(0).toUpperCase() + measurements[0].slice(1)} (${units[0]})`,
        },
        ...(singleAxisBounds
          ? {
            ticks: {
              stepSize: singleAxisBounds.step,
            },
            min: singleAxisBounds.min,
            max: singleAxisBounds.max,
          }
          : {
            ticks: {
              stepSize: leftYStep,
              callback: (value) => +value.toFixed(5),
            },
            min: leftYMin,
            max: leftYMax,
          }),
      };
    }
    // Handle dual measurements (left and right axes)
    else if (measurements.length === 2) {
      const leftDatasets = data.datasets.filter((d) => d.yAxisID === axisIds[0]);
      const rightDatasets = data.datasets.filter((d) => d.yAxisID === axisIds[1]);

      const { leftYMin, leftYMax, leftYStep, rightYMin, rightYMax, rightYStep } = getAxisBoundsAndStepValues(
        leftDatasets,
        rightDatasets,
        8,
        0.2,
      );

      scales[axisIds[0]] = {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: `${measurements[0].charAt(0).toUpperCase() + measurements[0].slice(1)} (${units[0]})`,
        },
        ticks: {
          stepSize: leftYStep,
          callback: (value) => +value.toFixed(5),
        },
        min: leftYMin,
        max: leftYMax,
      };

      scales[axisIds[1]] = {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: `${measurements[1].charAt(0).toUpperCase() + measurements[1].slice(1)} (${units[1]})`,
        },
        ticks: {
          stepSize: rightYStep,
          callback: (value) => +value.toFixed(5),
        },
        min: rightYMin,
        max: rightYMax,
      };
    }

    return {
      maintainAspectRatio: false,
      responsive: true,
      parsing: false,
      scales,
      ...(measurements.length > 1 && { plugins: structuredClone(chartPlugins) }),
    };
  };

  const chartOptions = buildChartOptions();

  return (
    <ChartWrapper id={chartId} data={data} options={chartOptions} onResampleChange={onResampleChange} />
  );
}

UniversalChart.propTypes = {
  data: PropTypes.object.isRequired,
  chartId: PropTypes.string.isRequired,
  measurements: PropTypes.arrayOf(PropTypes.string).isRequired,
  units: PropTypes.arrayOf(PropTypes.string).isRequired,
  axisIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  axisPolicy: PropTypes.string,
  startDate: PropTypes.object,
  endDate: PropTypes.object,
  onResampleChange: PropTypes.func,
};
