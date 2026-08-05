import { Box, Grid } from '@mui/material';
import { DateTime } from 'luxon';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import TempChart from '../../../charts/TempChart/TempChart';
import VwcChart from '../../../charts/VwcChart/VwcChart';
import { toPercentIfFraction } from '../../../charts/VwcChart/vwcValue';
import { getSensorChartData } from '../../../services/chartData';
import { sensorDataCacheKey } from '../catalog/historicalDataLoader';
import ChartPanelPlaceholder from './ChartPanelPlaceholder';

const TEROS_MEASUREMENTS = {
  vwc: 'Volumetric Water Content',
  ec: 'Electrical Conductivity',
  temperature: 'Temperature',
};

const TEMP_COLORS = ['#26C6DA', '#FF7043', '#A2708A'];
const EC_COLORS = ['#26C6DA', '#FF7043', '#A2708A'];
const VWC_COLORS = ['#26C6DA', '#FF7043', '#A2708A'];

function createDataset(timestamps, values) {
  return timestamps.map((timestamp, index) => ({
    x: timestamp,
    y: values[index],
  }));
}

function timestampMillis(timestamp) {
  const httpDate = DateTime.fromHTTP(timestamp);
  return httpDate.isValid
    ? httpDate.toMillis()
    : DateTime.fromISO(timestamp).toMillis();
}

function cachedPayload(cache, sensorUuid, measurement) {
  return cache?.[sensorDataCacheKey(sensorUuid, measurement)] ?? null;
}

function sensorSupportsTerosPanel(sensor) {
  return Boolean(sensor.has_chart_data) &&
    (sensor.panel_ids ?? []).some(
      (panelId) => panelId === 'teros' || panelId === 'temp',
    );
}

function TerosCharts({
  sensors = [],
  axiosPrivate,
  startDate,
  endDate,
  onDataStatusChange,
  variant = 'both',
  historicalSensorByKey,
  historicalLoading = false,
}) {
  const [resample, setResample] = useState('hour');
  const [vwcChartData, setVwcChartData] = useState({ labels: [], datasets: [] });
  const [tempChartData, setTempChartData] = useState({ labels: [], datasets: [] });
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fetchGenerationRef = useRef(0);

  const terosSensors = sensors.filter(sensorSupportsTerosPanel);

  async function getTerosChartData(loadSensors) {
    const entries = await Promise.all(
      loadSensors.map(async (sensor) => {
        const supportedMeasurements = new Set(
          (sensor.measurements ?? []).map((measurement) => measurement.toLowerCase()),
        );
        const requestedMeasurements = Object.values(TEROS_MEASUREMENTS).filter(
          (measurement) => supportedMeasurements.has(measurement.toLowerCase()),
        );

        const measurementEntries = await Promise.all(
          requestedMeasurements.map(async (measurement) => {
            const payload =
              resample === 'hour'
                ? cachedPayload(historicalSensorByKey, sensor.uuid, measurement)
                : await getSensorChartData(
                    axiosPrivate,
                    sensor.uuid,
                    measurement,
                    startDate,
                    endDate,
                    resample,
                  );
            return [measurement, payload];
          }),
        );

        return [
          sensor.uuid,
          {
            name: sensor.name,
            ...Object.fromEntries(measurementEntries),
          },
        ];
      }),
    );

    return Object.fromEntries(entries);
  }

  function applySensorChartData(sensorDataById, loadSensors) {
    const newVwcChartData = { labels: [], datasets: [] };
    const newTempChartData = { labels: [], datasets: [] };

    loadSensors.forEach((sensor, sensorIndex) => {
      const entry = sensorDataById[sensor.uuid];
      if (!entry) return;

      const name = entry.name ?? sensor.name;
      const vwcPayload = entry[TEROS_MEASUREMENTS.vwc];
      const ecPayload = entry[TEROS_MEASUREMENTS.ec];
      const temperaturePayload = entry[TEROS_MEASUREMENTS.temperature];

      if (Array.isArray(vwcPayload?.data) && vwcPayload.data.length > 0) {
        const timestamps = vwcPayload.timestamp.map(timestampMillis);
        newVwcChartData.labels = timestamps;
        newVwcChartData.datasets.push({
          label: `${name} Volumetric Water Content (%)`,
          data: createDataset(timestamps, vwcPayload.data.map(toPercentIfFraction)),
          borderColor: VWC_COLORS[sensorIndex % VWC_COLORS.length],
          borderWidth: 2,
          fill: false,
          yAxisID: 'vwcAxis',
          radius: 2,
          pointRadius: 1,
        });
      }

      if (Array.isArray(ecPayload?.data) && ecPayload.data.length > 0) {
        const timestamps = ecPayload.timestamp.map(timestampMillis);
        newVwcChartData.labels = timestamps;
        newVwcChartData.datasets.push({
          label: `${name} Electrical Conductivity (µS/cm)`,
          data: createDataset(timestamps, ecPayload.data),
          borderColor: EC_COLORS[sensorIndex % EC_COLORS.length],
          borderWidth: 2,
          fill: false,
          yAxisID: 'ecAxis',
          radius: 2,
          pointRadius: 0,
          borderDash: [5, 5],
        });
      }

      if (
        Array.isArray(temperaturePayload?.data) &&
        temperaturePayload.data.length > 0
      ) {
        const timestamps = temperaturePayload.timestamp.map(timestampMillis);
        newTempChartData.labels = timestamps;
        newTempChartData.datasets.push({
          label: `${name} Temperature (°C)`,
          data: createDataset(timestamps, temperaturePayload.data),
          borderColor: TEMP_COLORS[sensorIndex % TEMP_COLORS.length],
          borderWidth: 2,
          fill: false,
          radius: 2,
          pointRadius: 1,
        });
      }
    });

    setVwcChartData(newVwcChartData);
    setTempChartData(newTempChartData);
    setHasData(
      variant === 'vwc'
        ? newVwcChartData.datasets.length > 0
        : variant === 'temp'
          ? newTempChartData.datasets.length > 0
          : newVwcChartData.datasets.length > 0 || newTempChartData.datasets.length > 0,
    );
  }

  useEffect(() => {
    if (terosSensors.length === 0) return undefined;
    if (resample === 'hour' && historicalLoading) {
      // This effect tracks the central historical request lifecycle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true);
      return undefined;
    }

    const generation = ++fetchGenerationRef.current;
    setIsLoading(true);
    getTerosChartData(terosSensors)
      .then((sensorDataById) => {
        if (generation !== fetchGenerationRef.current) return;
        applySensorChartData(sensorDataById, terosSensors);
      })
      .catch((error) => {
        if (generation !== fetchGenerationRef.current) return;
        console.error('Error updating TEROS charts:', error);
        setHasData(false);
      })
      .finally(() => {
        if (generation === fetchGenerationRef.current) setIsLoading(false);
      });

    return () => {
      fetchGenerationRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors, resample, startDate, endDate, historicalSensorByKey, historicalLoading, variant]);

  useEffect(() => {
    if (terosSensors.length === 0) {
      // Clear chart state when the current selection has no TEROS source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVwcChartData({ labels: [], datasets: [] });
      setTempChartData({ labels: [], datasets: [] });
      setHasData(false);
      setIsLoading(false);
    }
  }, [terosSensors.length]);

  useEffect(() => {
    onDataStatusChange?.(hasData);
  }, [hasData, onDataStatusChange]);

  if (isLoading || (resample === 'hour' && historicalLoading)) {
    return <ChartPanelPlaceholder loading />;
  }
  if (!hasData) {
    return terosSensors.length > 0 ? <ChartPanelPlaceholder /> : null;
  }

  const chartHeight = { xs: '400px', md: '450px' };
  const panelChartSx = { height: '100%', width: '100%', minWidth: 0, minHeight: 0 };
  const vwcChart = (
    <VwcChart
      data={vwcChartData}
      startDate={startDate}
      endDate={endDate}
      onResampleChange={setResample}
    />
  );
  const tempChart = (
    <TempChart
      data={tempChartData}
      startDate={startDate}
      endDate={endDate}
      onResampleChange={setResample}
    />
  );

  if (variant === 'vwc') return <Box sx={panelChartSx}>{vwcChart}</Box>;
  if (variant === 'temp') return <Box sx={panelChartSx}>{tempChart}</Box>;

  return (
    <>
      <Grid item sx={{ height: chartHeight }} xs={12} sm={12} md={6} p={3}>
        {vwcChart}
      </Grid>
      <Grid item sx={{ height: chartHeight }} xs={12} sm={12} md={6} p={3}>
        {tempChart}
      </Grid>
    </>
  );
}

TerosCharts.propTypes = {
  sensors: PropTypes.array,
  axiosPrivate: PropTypes.func.isRequired,
  startDate: PropTypes.any,
  endDate: PropTypes.any,
  onDataStatusChange: PropTypes.func,
  variant: PropTypes.oneOf(['both', 'vwc', 'temp']),
  historicalSensorByKey: PropTypes.object,
  historicalLoading: PropTypes.bool,
};

export default TerosCharts;
