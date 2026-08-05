/**
 * Get aggregate historical availability for owned NodeFlow sensors.
 *
 * @param {import('axios').AxiosInstance} axiosPrivate
 * @param {string[]} sensorUuids
 */
export const getSensorDataAvailability = (axiosPrivate, sensorUuids) =>
  axiosPrivate
    .get('/api/data-availability/sensors', {
      params: {
        sensor_uuids: sensorUuids.join(','),
      },
    })
    .then((response) => response.data);
