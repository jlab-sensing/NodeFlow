import axios from 'axios';
import { DateTime } from 'luxon';
// import { useQuery } from 'react-query';

export const getPowerData = (cellId, startTime = DateTime.now().minus({ months: 1 }), endTime = DateTime.now(), resample = 'hour') => {
  return axios
    .get(`${import.meta.env.VITE_API_BASE_URL}/api/power/${cellId}?startTime=${startTime}&endTime=${endTime}&resample=${resample}`)
    .then((res) => res.data);
};

export const streamPowerData = (
  cellId,
  startTime = DateTime.now().minus({ months: 1 }),
  endTime = DateTime.now(),
  stream,
) => {
  return axios
    .get(`${import.meta.env.VITE_API_BASE_URL}/api/power/${cellId}?startTime=${startTime}&endTime=${endTime}&stream=${stream}`)
    .then((res) => res.data);
};
