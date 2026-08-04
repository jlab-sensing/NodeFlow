export const getSensorChartData = (
  axiosPrivate,
  sensorUuid,
  measurement,
  startDate,
  endDate,
  resample = 'hour',
) =>
  axiosPrivate
    .get(`/api/chart-data/sensors/${sensorUuid}`, {
      params: {
        measurement,
        start: startDate.toISO(),
        end: endDate.toISO(),
        resample,
      },
    })
    .then((response) => response.data);

export const getSensorPowerChartData = (
  axiosPrivate,
  sensorUuid,
  startDate,
  endDate,
  resample = 'hour',
) =>
  axiosPrivate
    .get(`/api/chart-data/sensors/${sensorUuid}/power`, {
      params: {
        start: startDate.toISO(),
        end: endDate.toISO(),
        resample,
      },
    })
    .then((response) => response.data);
