import { useQuery } from '@tanstack/react-query';

export const getChartSources = (client) =>
  client
    .get('/api/chart-sources/')
    .then((response) => response.data);

export const useChartSources = (client) =>
  useQuery({
    queryKey: ['chart-sources'],
    queryFn: () => getChartSources(client),
    refetchOnWindowFocus: true,
  });
